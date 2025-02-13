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

const buildRule = (tag, regex) => {
  const targets = proxies.filter(p => regex.test(p.tag)).map(p => p.tag)
  return targets.length ? {
    type: "logical",
    mode: "or",
    rules: [
      { geoip: [tag] },
      { domain_suffix: [tag] }
    ],
    outbound: targets[0] 
  } : null
}

const regionRules = [
  { tag: "hk", regex: /港|hk|hongkong|kong kong|🇭🇰/i },
  { tag: "tw", regex: /台|tw|taiwan|🇹🇼/i },
  { tag: "jp", regex: /日本|jp|japan|🇯🇵/i },
  { tag: "sg", regex: /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i },
  { tag: "us", regex: /美|us|unitedstates|united states|🇺🇸/i },
  { tag: "kr", regex: /韩|kr|korea|south korea|🇰🇷/i },
  { tag: "uk", regex: /英|uk|unitedkingdom|united kingdom|🇬🇧/i },
  { tag: "de", regex: /德|de|germany|🇩🇪/i },
  { tag: "fr", regex: /法|fr|france|🇫🇷/i },
  { tag: "nl", regex: /荷|nl|netherlands|holland|🇳🇱/i }
]

const newRules = regionRules
  .map(r => buildRule(r.tag, r.regex))
  .filter(Boolean)

config.route.rules = [
  ...config.route.rules,
  ...newRules,
  { protocol: "dns", outbound: "dns-out" },
  { geoip: "private", outbound: "block" }, 
  { geoip: "cn", outbound: "direct" },    
  { outbound: "COMPATIBLE" }              
].filter(Boolean)

config.outbounds = config.outbounds.filter(o => ![
  'all', 'all-auto', 'hk', 'hk-auto', 'tw', 'tw-auto', 
  'jp', 'jp-auto', 'sg', 'sg-auto', 'us', 'us-auto',
  'kr', 'kr-auto', 'uk', 'uk-auto', 'de', 'de-auto',
  'fr', 'fr-auto', 'nl', 'nl-auto'
].includes(o.tag))

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
