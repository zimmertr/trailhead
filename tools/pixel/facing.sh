#!/bin/sh
# usage: facing.sh <tag> [speed]  Logs every change of his facing on the map (B8, T37) while he walks each
# route from the Trailhead, as route:p:pose words in out/facing-<tag>-<route>.txt. A word every few
# thousandths of p means he is flipping back and forth.
cd "$(dirname "$0")"
SP=${2:-2}
L='window.__fl=[],window.__lf=null,setInterval(()=>(window.__i=window.__info,window.__f=window.__i&&window.__i.scene==="world"&&window.__i.running?window.__i.pose:null,window.__f&&window.__f!==window.__lf&&(window.__fl.push(window.__i.route+":"+window.__i.p.toFixed(4)+":"+window.__f),window.__lf=window.__f)),10)'
for r in lake:$((130/SP*1000)) stack:$((500/SP*1000)) spires:$((130/SP*1000)); do
  route=${r%%:*}; w=${r##*:}
  ./shot.sh facing-$1-$route.png "route=$route&speed=$SP" 960 600 "wait=2000;eval=$L;key=Space;wait=$w;eval=console.warn('FL '+window.__fl.join(' '))" 1 2>&1 | grep -o 'FL .*' > out/facing-$1-$route.txt
  echo "$route: $(wc -w < out/facing-$1-$route.txt) changes"
done
