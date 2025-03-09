// 🚀 sing-box 模板脚本，用于处理机场订阅
log(`🚀 开始`);

// type=组合订阅
// name=机场
// outbound=🕳ℹ️all|all-auto🕳ℹ️hk|hk-auto🏷ℹ️港|hk|hongkong|kong kong|🇭🇰🕳ℹ️tw|tw-auto🏷ℹ️台|tw|taiwan|🇹🇼🕳ℹ️jp|jp-auto🏷ℹ️日本|jp|japan|🇯🇵🕳ℹ️sg|sg-auto🏷ℹ️^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)🕳ℹ️us|us-auto🏷ℹ️美|us|unitedstates|united states|🇺🇸

// 读取传入参数
let { type, name, outbound, includeUnsupportedProxy, url } = $arguments;

log(`传入参数 type: ${type}, name: ${name}, outbound: ${outbound}`);

// 解析 type 参数，确定是组合订阅还是单订阅
type = /^1$|col|组合/i.test(type) ? "collection" : "subscription";

log(`① 解析配置文件`);
let config;
try {
  config = JSON.parse($content ?? $files[0]);
} catch (e) {
  log(`${e.message ?? e}`);
  throw new Error("配置文件不是合法的 JSON");
}

log(`② 获取订阅`);

let proxies;
if (url) {
  log(`直接从 URL ${url} 读取订阅`);
  proxies = await produceArtifact({
    name,
    type,
    platform: "sing-box",
    produceType: "internal",
    produceOpts: {
      "include-unsupported-proxy": includeUnsupportedProxy,
    },
    subscription: {
      name,
      url,
      source: "remote",
    },
  });
} else {
  log(`将读取名称为 ${name} 的 ${type === "collection" ? "组合" : ""}订阅`);
  proxies = await produceArtifact({
    name,
    type,
    platform: "sing-box",
    produceType: "internal",
    produceOpts: {
      "include-unsupported-proxy": includeUnsupportedProxy,
    },
  });
}

// 确保每个节点都有 tag 属性
proxies = proxies.map((proxy, index) => {
  if (!proxy.tag) {
    proxy.tag = `${name || "proxy"}-${index}`;
    log(`🛠 自动为节点生成 tag: ${proxy.tag}`);
  }
  return proxy;
});

log(`③ outbound 规则解析`);
const outbounds = outbound
  .split("🕳")
  .filter((i) => i)
  .map((i) => {
    let [outboundPattern, tagPattern = ".*"] = i.split("🏷");
    const tagRegex = createTagRegExp(tagPattern);
    log(
      `匹配 🏷 ${tagRegex} 的节点将插入匹配 🕳 ${createOutboundRegExp(
        outboundPattern
      )} 的 outbound 中`
    );
    return [outboundPattern, tagRegex];
  });

log(`④ outbound 插入节点`);
config.outbounds = config.outbounds.map((outbound) => {
  outbounds.forEach(([outboundPattern, tagRegex]) => {
    const outboundRegex = createOutboundRegExp(outboundPattern);
    if (outboundRegex.test(outbound.tag)) {
      if (!Array.isArray(outbound.outbounds)) {
        outbound.outbounds = [];
      }
      const tags = getTags(proxies, tagRegex);
      log(
        `🕳 ${outbound.tag} 匹配 ${outboundRegex}, 插入 ${tags.length} 个 🏷 匹配 ${tagRegex} 的节点`
      );
      outbound.outbounds.push(...tags);
    }
  });
  return outbound;
});

// 自动插入 COMPATIBLE 节点检查
const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible = false;

log(`⑤ 空 outbounds 检查`);
config.outbounds = config.outbounds.map((outbound) => {
  outbounds.forEach(([outboundPattern]) => {
    const outboundRegex = createOutboundRegExp(outboundPattern);
    if (outboundRegex.test(outbound.tag)) {
      if (!Array.isArray(outbound.outbounds)) {
        outbound.outbounds = [];
      }
      if (outbound.outbounds.length === 0) {
        if (!compatible) {
          config.outbounds.push(compatible_outbound);
          compatible = true;
        }
        log(`🕳 ${outbound.tag} 的 outbounds 为空, 自动插入 COMPATIBLE(direct)`);
        outbound.outbounds.push(compatible_outbound.tag);
      }
    }
  });
  return outbound;
});

// 将生成的节点附加到配置文件中
config.outbounds.push(...proxies);

$content = JSON.stringify(config, null, 2);

// 工具函数
function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag
  );
}
function log(v) {
  console.log(`[📦 sing-box 模板脚本] ${v}`);
}
function createTagRegExp(tagPattern) {
  return new RegExp(
    tagPattern.replace("ℹ️", ""),
    tagPattern.includes("ℹ️") ? "i" : undefined
  );
}
function createOutboundRegExp(outboundPattern) {
  return new RegExp(
    outboundPattern.replace("ℹ️", ""),
    outboundPattern.includes("ℹ️") ? "i" : undefined
  );
}

log(`🔚 结束`);
