const { type, name } = $arguments;

let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

proxies.forEach((proxy, index) => {
  if (!proxy.tag) {
    proxy.tag = `proxy_${index}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "");
  }
});

proxies.forEach(proxy => {
  if (!config.outbounds.find(outbound => outbound.tag === proxy.tag)) {
    config.outbounds.push(proxy);
  }
});

const autoGroups = [
  { tag: 'auto-all', regex: null },
  { tag: 'auto-hk', regex: /港|hk|hongkong|kong kong|🇭🇰/i },
  { tag: 'auto-tw', regex: /台|tw|taiwan|🇹🇼/i },
  { tag: 'auto-jp', regex: /日本|jp|japan|🇯🇵/i },
  { tag: 'auto-kr', regex: /韩|kr|korea|🇰🇷/i },
  { tag: 'auto-uk', regex: /英|uk|unitedkingdom|🇬🇧/i },
  { tag: 'auto-de', regex: /德|de|germany|🇩🇪/i },
  { tag: 'auto-fr', regex: /法|fr|france|🇫🇷/i },
  { tag: 'auto-nl', regex: /荷|nl|netherlands|🇳🇱/i },
  { tag: 'auto-sg', regex: /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i },
  { tag: 'auto-us', regex: /美|us|unitedstates|united states|🇺🇸/i }
];

autoGroups.forEach(group => {
  const existing = config.outbounds.find(o => o.tag === group.tag);
  if (!existing) {
    config.outbounds.push({
      tag: group.tag,
      type: "urltest",
      outbounds: getTags(proxies, group.regex),
      url: "http://www.gstatic.com/generate_204",
      interval: "5m",
      tolerance: 150
    });
  } else {
    existing.type = "urltest";
    existing.url = "http://www.gstatic.com/generate_204";
    existing.interval = "5m";
    existing.tolerance = 150;
    existing.outbounds = getTags(proxies, group.regex);
    delete existing.filter;
    delete existing.interval;
    delete existing.tolerance;
  }
});

if (!config.outbounds.find(o => o.tag === "proxy")) {
  config.outbounds.push({
    "tag": "proxy",
    "type": "urltest",
    "outbounds": ["auto-all"],
    "url": "http://www.gstatic.com/generate_204",
    "interval": "5m"
  });
}

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}
