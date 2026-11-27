// Extract observations from individual lines so adjacent table cells or unrelated
// sections cannot turn a founding year or financing round into a company metric.
export function commercialFacts(company, sources) {
  const facts = {headcount:[], funding:[], revenue:[]};
  const name = String(company.name || "").trim().toLowerCase();
  for (const [i, source] of sources.entries()) {
    if (!name || !String(source.title).toLowerCase().includes(name)) continue;
    const ref = "[S"+(i+1)+"]";
    const add = (kind, value, quote) => {
      if (!facts[kind].some(x => x.ref === ref && x.value === value))
        facts[kind].push({value, ref, quote, source:source.title, url:source.url,
          ...(kind==="revenue" ? {
            periods:[...new Set(quote.match(/\b(?:19|20)\d{2}F?\b/g)||[])],
            currencies:[...new Set(quote.match(/GBP|EUR|USD|[$£€]/gi)||[])],
            basis:/annual recurring|\bARR\b/i.test(quote)?"Reported ARR":/estimat|suggest|forecast|\b20\d{2}F\b/i.test(quote)?"Estimate":"Source-reported revenue",
            reliability:"Verify against underlying accounts"
          } : {})});
    };
    for (const line of String(source.snippet || "").replace(/^(employees|headcount|company size)\s*\n\s*:\s*/gim,"$1: ").split(/\n|(?<=[.!?])\s+/)) {
      const count = line.match(/\b(\d[\d,]*(?:\s*[-–]\s*\d[\d,]*|\+)?)\s+(?:total )?(?:employees|people)\b/i)
        || line.match(/\b(?:employees|headcount|company size)\s*[:|]\s*(\d[\d,]*(?:\s*[-–]\s*\d[\d,]*|\+)?)/i);
      if (count && !/\b(?:hired|hiring|recruited|added|laid off)\s*$/i.test(line.slice(0,count.index)) && !/\bfounded\s+(?:in\s+)?\d{4}\s*$/i.test(line.slice(0,line.indexOf(count[1])+count[1].length))) add("headcount",count[1],line);
      const funding = line.match(/(?:total funding(?: raised)?(?: now)?\s*(?:of|exceeds|is|:)?\s*|raised\s+)((?:more than |over )?\$[\d,.]+\s*(?:million|billion|bn|[mb])\b)/i);
      if (funding && (/total funding/i.test(funding[0]) || /(?:in all|to date|in total)/i.test(line.slice(funding.index+funding[0].length, funding.index+funding[0].length+20)))) {
        add("funding",(/exceeds/i.test(funding[0])?"> ":"")+funding[1],line);
      }
      if (/\b(?:revenues?|turnover|ARR)\b/i.test(line) && /(?:[$£€]|GBP|USD|EUR)\s*[\d,.]+/i.test(line) && line.length<650)
        add("revenue",line.trim(),line);
    }
  }
  return facts;
}

export const themeKey = value => String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g,"");

export function verifiedPostingDate(date, evidence, sources) {
  const norm = s => String(s || "").replace(/[‐‑–—]/g,"-");
  const value=norm(date);
  if (!/^\d{4}-\d\d-\d\d$/.test(value)) return "";
  return [...String(evidence).matchAll(/\[S(\d+)\]/g)].some(m => {
    const text=norm(sources[Number(m[1])-1]?.snippet);
    return new RegExp("(?:datePosted|posted(?: on)?|posting date)[^a-z0-9]{0,10}"+value,"i").test(text);
  }) ? value : "";
}
