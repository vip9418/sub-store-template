const { type, name } = $arguments;
const compatibleOutbound = {
  tag: 'compatible', 
  type: 'direct',
};

let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

proxies.forEach(proxy => {
  if (!config.outbounds.find(outbound => outbound.tag === proxy.tag)) {
    config.outbounds.push(proxy);
  }
});

config.outbounds.map(i => {
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }
  if (['hk', 'hk-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /港|hk|hongkong|kong kong|🇭🇰/i));
  }
  if (['tw', 'tw-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /台|tw|taiwan|🇹🇼/i));
  }
  if (['jp', 'jp-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /日本|jp|japan|🇯🇵/i));
  }
  if (['kr', 'kr-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /韩|kr|korea|🇰🇷/i));
  }
  if (['uk', 'uk-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /英|uk|unitedkingdom|🇬🇧/i));
  }
  if (['de', 'de-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /德|de|germany|🇩🇪/i));
  }
  if (['fr', 'fr-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /法|fr|france|🇫🇷/i));
  }
  if (['nl', 'nl-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /荷|nl|netherlands|🇳🇱/i));
  }
  if (['sg', 'sg-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i));
  }
  if (['us', 'us-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i));
  }
});
let compatibleAdded = false;
config.outbounds.forEach(outbound => {
  if (outbound.tag === "proxy" && Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!config.outbounds.some(o => o.tag === "compatible")) {
      config.outbounds.push(compatibleOutbound);
    }
    outbound.outbounds.push(compatibleOutbound.tag);
    compatibleAdded = true; 
  }
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}
