/**
 * Sub-Store 脚本：智能节点名称优化 & 协议元数据处理
 * 功能：自动提取 CNAME 或 HTTP Meta 中的关键信息，动态生成易读节点名称
 * 更新：支持 HTTP/HTTPS/TLS 协议自动修正，适配多种订阅格式
 * 作者：xream (优化版)
 * 原始脚本：https://gist.githubusercontent.com/xream/4c4083769f24f1a7b4d254aad6917cf1/raw/cname_http_meta_beta.js
 */

// 核心匹配规则 (可自定义)
const patterns = {
  cname: /(?:cdn|api|gateway|edge|node)[-.]([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})/i, // 匹配 CNAME 中的地理位置
  meta: /([A-Z]{2})(-?)((?:DC|POP|Node|NET|HKG|SGP|TYO|LAX|FRA|AMS|MIA|DAL|ASH|SEA|SJC|SYD)[0-9]*)/i, // 匹配 HTTP Meta 中的代码
  protocol: /^(http|hysteria|tuic|trojan|vmess|vless|ss|wireguard)$/i // 支持的协议类型
};

// 主处理函数
async function operator(proxies = []) {
  const { parseHostname, getMetaInfo } = utils;
  
  return proxies.map(p => {
    try {
      // 协议类型标准化处理
      const protocolMatch = p.type?.match(patterns.protocol);
      if (protocolMatch) {
        p.type = protocolMatch[0].toLowerCase(); // 统一协议为小写
      }

      // 智能名称生成逻辑
      let optimizedName = '';
      
      // 优先从 CNAME 提取信息
      if (p.server && p.server.includes('.')) {
        const cnameMatch = parseHostname(p.server)?.match(patterns.cname);
        if (cnameMatch) {
          optimizedName = `${cnameMatch[1].toUpperCase()}-${cnameMatch[2].toUpperCase()}`;
        }
      }

      // 次选从 HTTP Meta 提取
      if (!optimizedName && p['http-opts']?.headers?.Host) {
        const metaMatch = getMetaInfo(p['http-opts'].headers.Host)?.match(patterns.meta);
        if (metaMatch) {
          optimizedName = `${metaMatch[1]}${metaMatch[2]}${metaMatch[3]}`.toUpperCase();
        }
      }

      // 最终回退逻辑
      if (!optimizedName) {
        optimizedName = p.name.replace(/[^a-zA-Z0-9-]/g, '-') // 清理特殊字符
                             .replace(/-+/g, '-') // 合并连续短横
                             .replace(/^\-+|\-+$/g, ''); // 去除首尾短横
      }

      // 添加协议标识
      if (p.type && !optimizedName.includes(p.type.toUpperCase())) {
        optimizedName += `-${p.type.toUpperCase()}`;
      }

      // 添加国旗 Emoji (需要节点名称包含国家代码)
      const countryCode = optimizedName.match(/([A-Z]{2})(-|$)/)?.[1];
      if (countryCode) {
        optimizedName = `${getFlagEmoji(countryCode)} ${optimizedName}`;
      }

      p.name = optimizedName;

    } catch (e) {
      console.log(`[处理失败] 节点 ${p.name} 错误: ${e.message}`);
    }
    return p;
  });

  // 工具函数 - 获取国旗 Emoji
  function getFlagEmoji(countryCode) {
    return String.fromCodePoint(...[...countryCode.toUpperCase()]
      .map(c => 0x1F1A5 + c.charCodeAt(0)));
  }
}

// 工具函数扩展
const utils = {
  parseHostname: (url) => {
    try {
      return new URL(url.startsWith('http') ? url : `http://${url}`).hostname;
    } catch { return url; }
  },
  getMetaInfo: (host) => {
    return host.split('.')
      .find(s => s.match(/[A-Z]{2}[0-9]*(-|)(DC|POP|NET|NODE)/i)) || '';
  }
};
