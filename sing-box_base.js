const { type, name } = $arguments
const compatible_outbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
}

let compatible
let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

config.outbounds.push(...proxies)

if (!config.outbounds.some(o => o.tag === 'COMPATIBLE')) {
  config.outbounds.push(compatible_outbound)
}

config.outbounds.map(i => {
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies))
  }
  if (['hk', 'hk-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /港|hk|hongkong|kong kong|🇭🇰/i))
  }
  if (['tw', 'tw-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /台|tw|taiwan|🇹🇼/i))
  }
  if (['jp', 'jp-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /日本|jp|japan|🇯🇵/i))
  }
  if (['sg', 'sg-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i))
  }
  if (['us', 'us-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i))
  }
  if (['kr', 'kr-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /韩|kr|korea|south korea|🇰🇷/i))
  }
  if (['uk', 'uk-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /英|uk|unitedkingdom|united kingdom|🇬🇧/i))
  }
  if (['de', 'de-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /德|de|germany|🇩🇪/i))
  }
  if (['fr', 'fr-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /法|fr|france|🇫🇷/i))
  }
  if (['nl', 'nl-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /荷|nl|netherlands|holland|🇳🇱/i))
  }
})

config.outbounds.forEach(outbound => {
  if (outbound.type === 'selector' && outbound.outbounds?.length === 0) {
    outbound.outbounds.push('COMPATIBLE')
  }
})

config.outbounds.forEach(o => {
  if (!o.tag) {
    o.tag = `auto_tag_${Math.random().toString(36).substr(2, 5)}`
  }
})

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
