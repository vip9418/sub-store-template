/**
 * Sub-Store 节点可用性检测脚本
 * 用法：在 Sub-Store 中添加脚本操作
 * 参数示例：#timeout=5000&retries=2&fastest=3&threshold=80&interval=3600
 * 
 * 参数说明：
 * [timeout=5000]     单个节点测试超时时间（毫秒）
 * [retries=2]        失败节点重试次数
 * [fastest=3]        保留最快的前 N 个节点
 * [threshold=80]     丢包率阈值（超过此值的节点会被剔除）
 * [interval=3600]    自动更新间隔（秒）
 * [verbose]          显示详细测试日志
 * [fallback]         保留部分不可用节点作为备用
 */

const $arguments = arguments;
const startTime = Date.now();

// 配置参数解析
const config = {
    timeout: parseInt($arguments.timeout) || 5000,
    retries: parseInt($arguments.retries) || 2,
    keepFastest: parseInt($arguments.fastest) || 3,
    lossThreshold: parseInt($arguments.threshold) || 80,
    checkInterval: parseInt($arguments.interval) || 3600,
    verbose: $arguments.verbose !== undefined,
    fallback: $arguments.fallback !== undefined
};

// 节点状态缓存对象
const nodeStatus = {
    lastChecked: 0,
    results: {}
};

async function probeNode(node) {
    const testURL = "https://www.gstatic.com/generate_204";
    let retry = config.retries;
    let success = false;
    let latency = 0;
    let packetLoss = 100;

    while (retry-- > 0 && !success) {
        try {
            const start = Date.now();
            const response = await $.http.get({
                url: testURL,
                timeout: config.timeout,
                policy: $environment.policy
            });

            if (response.status === 204) {
                latency = Date.now() - start;
                packetLoss = 0;
                success = true;
            }
        } catch (e) {
            if (config.verbose) console.log(`[测试失败] ${node.name}: ${e.message}`);
        }
    }

    return {
        latency: success ? latency : Infinity,
        loss: success ? 0 : 100,
        lastChecked: Date.now()
    };
}

function filterNodes(nodes) {
    return nodes.filter(node => {
        const status = nodeStatus.results[node.name];
        if (!status) return true;
        
        return status.loss < config.lossThreshold;
    }).sort((a, b) => {
        const statusA = nodeStatus.results[a.name] || { latency: Infinity };
        const statusB = nodeStatus.results[b.name] || { latency: Infinity };
        return statusA.latency - statusB.latency;
    }).slice(0, config.keepFastest);
}

async function main() {
    // 缓存有效性检查
    if (Date.now() - nodeStatus.lastChecked < config.checkInterval * 1000) {
        return filterNodes($arguments.nodes);
    }

    // 执行节点测试
    const testPromises = $arguments.nodes.map(async node => {
        const result = await probeNode(node);
        nodeStatus.results[node.name] = result;
        if (config.verbose) {
            console.log(`[测试结果] ${node.name} | 延迟: ${result.latency}ms | 丢包率: ${result.loss}%`);
        }
    });

    await Promise.all(testPromises);
    nodeStatus.lastChecked = Date.now();

    // 生成最终节点列表
    const validNodes = filterNodes($arguments.nodes);
    
    if (config.fallback) {
        const backupNodes = $arguments.nodes.filter(node => 
            !validNodes.includes(node)
        ).slice(0, 2);
        return [...validNodes, ...backupNodes];
    }

    return validNodes;
}

// 执行主程序
main().then(nodes => {
    const endTime = Date.now();
    console.log(`[节点检测完成] 总耗时: ${endTime - startTime}ms`);
    console.log(`[有效节点] 共 ${nodes.length} 个`);
    $done(nodes);
});
