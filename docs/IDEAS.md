# Pixel MVP: ideas for later

Things that would make the pixel trailhead look, feel, perform and behave better, written during the overnight build of 2026-11-14. Nothing here is built. The site is a resume first and a game second, so each idea is judged by one question: does it help a visitor learn who TJ is, or enjoy finding out?

## Says more about TJ

- **Real numbers on the lake cards.** "In the mountains" could show this year's totals from Strava and Peakbagger (kilometres run, metres climbed, summits) the way the project cards show stars. A scheduled job writes them into a content file, so the page never calls those services.
- **A summit log.** A short list of recent peaks on the map card, each one a link to its Peakbagger page. It would turn "peakbagger" from a claim into evidence.
- **A fourth pitch for leadership.** Proficiency Peak covers platform, reliability and software. Mentoring, hiring and running a team have no card. A belay ledge where he brings up a second climber would show it without a paragraph.
- **Certifications as gear.** The wilderness first aid card and any cloud or Kubernetes certificates could hang on the pack at base camp, each one clickable.
- **Projects that stay current.** The project numbers were typed in on 2026-11-14. A nightly job that rewrites `content.js` from the GitHub API keeps stars and releases honest, and a new repository gets a seventh summit without anyone drawing one by hand.
- **The site's own status, for real.** The kiosk shows a version and an uptime that are made up in the browser. The real values (the running image tag, the Argo Rollouts step, the last deploy) are the best proof of the platform work the cards describe.
- **The lookout watches the site (E5j).** Observability Lookout only names itself on hover today. A click could open a card on TJ's observability work, with the site's own live dashboards behind it (request rate, error budget, the last deploy), so the joke name leads somewhere real.
- **A one-page resume from the same content.** The plain page already holds every card as text. A print stylesheet would make it a resume that prints on one sheet, always in step with the site.

## Looks better

- **TJ's own drawing of himself.** The runner is 22 pixels tall and reads well, but a larger portrait on the junction sign, drawn at the same pixel size as the world, would give the first screen a face.
- **Seasons.** The palette is one table. A second table for larch season (gold needles, first snow) and a third for winter would change every scene at once, picked by the month.
- **Weather that matches Seattle.** Rain on the forest scene when it is raining at home, clear skies when it is not. The data is already in Bluebird Forecast.
- **A drawn night.** Dusk stops at twilight. A full night with headlamps, a lit tent at base camp and the Milky Way over the Spires would be a third theme.
- **Parallax on the map.** The world map scrolls as one flat sheet. Letting the far range behind the three landmarks drift more slowly would give it depth for almost no cost.
- **Smoother walking.** Six frames for the run and four for the walk. Eight and six would take the stutter out at the cost of an hour of pose work.

## Feels better

- **Choose your own pace.** Space starts and stops, but there is one speed. Holding Shift for a walk, or tapping twice for a sprint, would let a reader linger.
- **The fall, driven.** The lead fall on pitch two always happens. Letting the visitor pick a hold (one solid, one that breaks) would make the catch land harder, and the reliability card with it.
- **A glissade you steer.** Left and right during the slide down from each summit, with nothing to win or lose.
- **Cats that follow.** One of them could trot a little way down whichever trail he takes, then give up and sit.
- **Touch gestures.** Swipe along the bottom to scrub, swipe up on a card to dismiss it, pinch on the trail map to zoom.
- **Gamepad.** The whole site needs five inputs. A controller would suit it.
- **Photo mode.** A key that hides every panel and saves the frame as a PNG at a chosen scale.

## Behaves better

- **Real addresses.** The `#name` addresses work, but real paths (`/proficiency-peak/summit`) are better for sharing and for search engines. The server needs one rule to send every path to the same page.
- **A link preview per card.** A picture and a sentence for each address, so a shared link to a project shows that project.
- **Screen reader pass.** The plain page covers reading. The world itself announces cards, but the events (the fall, the eggs) are silent. Short spoken lines for each would close the gap.
- **Remember where he was.** Coming back to the site could offer "carry on from pitch two" instead of starting at the Trailhead.
- **Translations.** All copy lives in `content.js`, so a second language is one more file.
- **Tests that look.** One screenshot per scene compared with a stored one in CI would catch the kind of slow decline the 3D prototype suffered.

## Performs better

- **Draw only what changed.** Every scene repaints every pixel on every frame. Most frames differ in a few hundred pixels. Keeping the still layers and repainting only the moving parts would cut the work by most of it, which matters on phones.
- **Pause when hidden.** Stop drawing and stop the music when the tab is in the background.
- **Build scenes off the main thread.** The forest and the wall take a moment to paint at load. A worker could paint them while the map is already on screen.
- **A smaller first load.** The page is about 1 MB of script with no build step, and `ground.png` 1.5 MB. Minified and compressed the script would be a fraction of that, and the fonts could be cut down to the letters in use.

## Sound

- **Footsteps and gear.** The PRD asks for footsteps, and they were left out because a step sound three times a second wears thin. Quiet ones, changing with the ground (dirt, rock, snow), are worth another try.
- **A listening pass.** Every note was written in code without being listened to. An hour with headphones would find the wrong ones.

## Smaller things

- A name for the lake peak on a sign.
- The bear could wave.
- A marmot answering the first marmot from across the lake.
- Doot Doot asleep on the keyboard of the hut on TJs-Kubernetes-Service.
- A photo of the real Doot Doot and Peevers on the personal note.
- Sasquatch in the register.
- A Steller's jay that steals from the snack break.
- The gray jay landing on his hand.
- A second off-route page for a server error: a rockfall across the trail.

## Round 4 (from 2026-11-15)

Kept current while round 4 is built: ideas are added as they come up and deleted once built or decided against. The plan itself is in `ROUND4.md`.

### Timed events not chosen for the checklist

- **Other hikers.** A tiny party walks a trail or crosses the glacier roped up, and waves if he passes.
- **Larch needles on the map.** On a gust, gold needles blow off the larches.
- **Elk bugling at Dusk** in the parkland, heard before it is seen.
- **An otter in the river** below the waterfall, on its back.

### Places and scenes

- **Carry on along the ridge.** After a Spires summit, offer the ridge to the next summit as well as the glissade to camp, so a keen visitor can link all six as one traverse.
- **The work history as the larch approach.** Cairns or signs along the larch basin scene could name the places TJ has worked, oldest first, so the walk in is the career and the West Ridge is the skills.
- **The summit register on Proficiency Peak.** A small tin box under the top boulder that he signs, as a thing to find, with earlier names as a place for credits or thanks (the trail register at the Trailhead is built; this would be its summit twin).
- **A second lake scene at Dusk**: alpenglow on the mountain and its mirror, the one postcard view of the site.
- **The tide pools up close.** Tapping a pool at low tide could open a small close-up with its animals named.

- Taking turns on the West Ridge: who leads each pitch, and which follower climbs second, drawn at random per visit. TJ's first wish; set aside in round 4 so only the black-haired man needs the leading and falling drawings.
- A shivering belayer on the West Ridge: when the scene looks windy and cold, whoever is belaying visibly shivers while waiting for the climber (TJ, 2026-11-15; not part of the round 4 build).
- **The eyes in the fog as a thing to find.** Tapping a pair of eyes at Dusk before they blink out could count as a find, with a short line in the voice of the rainforest. The owl could hoot (a soft `audio.js` call) when tapped.

### Finds for TJ to choose from (L11, nothing built)

The list has 17 finds and every one still answers. New ones wait for TJ's pick (J6, the walk to camp, has none yet). Candidates, each tied to something true about him:

- **Kayti's painting at camp.** Tapping her easel shows what she is painting that day: one of the six summits.
- **A cairn on the moraine crest (J6).** Tapping it adds a stone, the way every party does on the way to camp.
- **The ferry's horn.** Tapping the ferry when it is in view sounds its horn, for the Seattle commute.
- **A shooting star at Dusk.** Tapping one before it fades counts, and shows the one place TJ would go to watch them.
- **The elk in the meadow.** Tapping the bull at the right moment makes him bugle, as they do in the Olympics each fall.
- **His real summit list.** A small summit log on Proficiency Peak's top that opens to the peaks TJ has stood on (with the register idea above).

### Page and feel

- **The opening view as the share picture.** The wide skyline frame is the natural image for link previews.

### Climbs not used for the six summits

- **The great ice face.** One long steep wall of blue ice with tools the whole way and one rest on a ledge. A candidate for a seventh project.
- **Racing a storm.** A clear start, cloud building behind him, the summit reached as the first gusts hit.
- **An alpine start.** Camp left in the dark by headlamp, the sky paling on the ridge, sunrise on top.
- **Fast and light.** He runs a snow ridge in trail shoes with poles and a vest, the quickest climb of all. A nod to the running.
- **A strength scramble.** Big blocks: mantles, pull-ups over lips, a chimney pressed with arms and legs.
- **A trail all the way up.** Switchbacks, a signpost at each bend, a cable handrail near the top. The summit anyone could walk to.
- **A rock tower by its chimney.** Free climbing with an old tree's roots hanging down the chimney as holds, two ravens, a squirrel on the trunk.
- **The lenticular cloud tells the forecast.** Tapping the cloud over Mount Monolith could show a line from Bluebird Forecast, TJ's weather app: high wind on the summit, no climbing today. It would link the sky to one of his projects.
- **The sound of the shower.** While the rain in the west is on screen, a soft hiss of rain on leaves that swells as the front comes in and dies away as it stops, quieter the farther off the view is.
- **A ferry terminal on the beach.** TJ lives in Seattle, where the green and white ferries are part of every day. The ferry could cross in from the west edge to a small terminal (a slip, a car ramp and a waiting room) on the new shore, load and sail again, so it stays in view the whole time it is on the map.
- **Seen the avalanche.** A visitor who watched Mount Monolith's avalanche could find it noted in the trail register, as climbers note what they saw on the mountain that day.
- **The creek follows the tide out.** At low water the rainforest's creek could run on across the bared flat in a braided channel to the water's new edge, as creeks do on Olympic beaches.
- **The snout calves.** Now and then a slab of the Spires' ice cliff could break off into its lake with a splash, a ring of ripples and a new floe drifting out, with a start button in the debug menu like the other timed events.
- **The look round says why.** While the view rests on a destination in the look round at the Trailhead, its plank on the junction sign could light up, so a visitor ties the place in view to the button that goes there.
- **Name the gear.** Hovering or tapping a piece on the West Ridge could name it in a small label (a cam, the old piton, the bolt at the lip of the off-width), so a visitor who has never climbed learns what holds a fall and why the slab is scary with only one piece under it.
- **Lean back on the anchor.** At a hanging belay the three could lean out on their tethers, feet on the rock, the way people really wait on a big face, instead of standing; it shows the anchor holding them.
- **Name the holds.** Tapping a chalked hold on the West Ridge could name it (a jug, a crimp, a pocket, the mercy hold) and the move that uses it, so a visitor learns a little of how climbing works while they wait for the followers.
- **Shout over the wind.** At the windiest belays a short speech bubble could be torn away downwind mid-word ("OFF BEL..."), the way calls really get lost up high, and it teaches the calls climbers use.
- **Point out the camp.** From the summit a tiny tent and a wisp of stove steam could show on a bench by a tarn far below, the camp they walked out of that morning, tying the climb back to the larch basin scene.
- **The Brocken spectre.** At the summit, with the sun behind them, their three shadows could fall on the cloud sea below, each ringed by a small rainbow glory, the way climbers sometimes see themselves above an inversion.
- **The raven rolls.** Ravens play in the wind: now and then it could flip onto its back for a beat and roll upright again, which climbers love to see and which would reward a visitor who waits at a belay.
- **A hood that reads as a hood.** Seen side-on at this size a hood up under the helmet can read as long hair; a hood that stands a pixel proud of the head at the back, with its own outline, would read as fabric.
- **Call "Rope!"** Before throwing a rappel rope climbers shout "Rope!" so nobody below gets hit. A one-word bubble from the leader as he throws would teach it.
- **The rope's ghost.** On a later visit to the West Ridge, the orange rope could still be hanging from the flake under the cloud, a little faded, the way abandoned ropes stay on real routes for years.
- **Drizzle under the cloud.** A few grey streaks of drizzle under the inversion would sell the change of weather from the sunlit top.
- **"Off belay!" behind the card.** While a card is open, the follower's arrival at the anchor could be marked with a small call bubble at the card's edge, so the visitor knows the team is ready without closing it.
- **Morning mist that burns off.** On the lake's wooded shore the mist could be thick on the first visit of the day and thinner on each later one, the way valley mist lifts as the sun gets onto the water.
- **Flowers that follow the season.** The lake's drifts could change with the visit's date: lupine and paintbrush in July, bistort and fading heather in August, red huckleberry and bare stalks by late September.
- **Name the features on the mountain.** Tapping Monolith from the lake could put small labels on Liberty Cap, the crater and Little Tahoma, each with a line on what it is, the way a summit panorama board does.
- **A still morning.** On a calm visit (no wind in the debug weather) the cat's paws could stop and the mirror go glassy, the way Reflection Lakes is only perfect before the breeze gets up.
- **A party on Monolith at Dusk.** The plan once had headlamps on Monolith too. A second party, on the mountain's own glacier, would show at the lake and on the map alike, so they would stay in step.
- **Wave from the traverse.** Far below, a tiny figure could be setting out from the Trailhead kiosk; tapping it, TJ waves and a speck of a hand waves back.
- **Name the towers from afar.** Tapping one of the Spires on the walk in could show its repo's name small over it, the same tag camp hangs on its summit, so a visitor learns them before arriving.
- **Step onto the ice.** On the moraine a tap on the glacier could have him peer over the edge into a crevasse, the blue going down and down, and a stone he kicks clatter in after a long second.
- **Trace the route.** At camp, holding a finger on a summit could draw its climb's line up the wall in a faint dotted line before he sets off, the way a topo shows it.
- **A steeper flower slope.** On the traverse the near slope could show its steepness with the meadow's drifts and the firs leaning into the view, flowers shrinking up toward the trail and a stone now and then bouncing down past the camera.
- **Read the forecast.** On Bluebird Forecast's summit a tap on the weather station could show the real forecast card the app would have given for that window (wind dropping, cloud base below the summit), so a visitor sees what the app does before reading about it.
- **Drop something in.** On TJs-Kubernetes-Service a tap on a crevasse could have him drop a chip of ice, and the sound of it hitting comes a long second later.
- **The workout synced.** On hevy-garmin-sync's summit, a tap on the watch could show the climb as a workout card the way the app writes it to Garmin (sets, rests, total time), which explains the project in one look.
- **Spot yourself.** On trailhead's knife-edge a tap on the map far below could ring the place a visitor has been to most (or has not found yet) with a small blinking marker, the way you pick out your own house from a plane.
- **Clip in yourself.** On yggdrasil a visitor could tap to move the lanyards past each anchor themselves, and he will not climb on until they have, never letting both come off at once.
- **Probe the bridge.** On Kubernetes-Manifests he could prod the snow bridge with his axe before stepping on, the pole going in further than it should, the way a glacier party tests a bridge.
- **A pencil that wears down.** The register's pencil on its string could get a little shorter each time someone signs, and a new one tied on when it is a stub.
- **The map behind glass, up close.** A tap on the little map in the register box could open the trail map sheet, the way a visitor leans in to read it.
- **Something left in the box.** Real register boxes collect a lost glove or a sticker; one small object in the corner of the box could change with the season or the time of day.
- **Turn the page.** With more entries than one page holds, a corner of the right-hand page could lift, and a tap turns back to older pages.
- **The pencil writes.** While a visitor types on the left-hand page, the pencil could lift off the page and follow the last letter.

## Round 5 planning (2026-11-16)

### Offered to TJ for round 5 and not picked (kept for later)

- **A slow-phone check.** Round 4's frame times come from a fast machine in Docker. Measure at 4x CPU slowdown, and let the game drop its costliest layers by itself (mist detail, the zoomed-out redraw) when a frame runs long.
- **A link preview.** A page title, description and a preview image (a good render of the map at golden hour) so a link shared on LinkedIn or Slack looks like the site.
- **Reduced motion.** The camera (round 4), AUTO and the idle tour (round 5, K1) already follow the system's reduce-motion setting. What is left is fewer screen-wide effects for that visitor: the glissade's burst of snow and the whiteout on the Kubernetes-Manifests climb.
- **A copy review page.** Generated from `content.js`: every line a visitor can read, grouped by place, so TJ can review all the draft copy in one sitting.

### Climb scenes for later (TJ asked for these to be kept, 2026-11-16)

- **A Tyrolean traverse.** A rope strung between two towers that TJ pulls himself across, hanging below it, the gap and the glacier far underneath. Easy to read side-on. Offered as the fallback for trailhead's knife-edge.
- **A corniced snow ridge.** A snow crest with an overhanging cornice on one side and his boot track kept well back on the safe side, a chunk of cornice breaking off and tumbling down the far face.

### My own, written while planning round 5

- **Kayti's painting grows.** Her watercolour at base camp gains a little more of the Spires each time a summit is done, and a click shows it full size. Done all six, and it's finished and signed.
- **Footprints that stay.** TJ's boot prints on the bared sand at low tide and on the glacier's snow, fading after a while and washed out when the tide comes in.
- **The eagle and the gulls.** Gulls mob the eagle when it carries a fish past the stacks, and now and then it drops the fish and a gull takes it.
- **A rainbow in the waterfall's spray** on the new switchback climb, when the sun is low on the Auto clock.
- **Sunset alpenglow on Monolith and the Spires** as the Auto clock passes through sunset: the high snow goes pink for those 30 seconds. It brings back the round 3 Dusk TJ liked without a sky to light.
- **Lights in the lookout.** At Dusk a warm window glows in the fire lookout on Off By One Peak, and a tiny figure looks out.
- **The bear family reacts to TJ.** When his figure passes close to the clearing, the sow stands up to look and the cubs scramble behind her.
- **A moose in the river.** The bull stands knee-deep in the river now and then, dripping, with water plants hanging from his mouth.
- **The register knows the time.** Entries signed at dusk on the Auto clock are written by headlamp, with a small lamp drawn on the page.
- **A trail-running Strava segment.** On hevy-garmin-sync's run, a tiny "segment" banner shows his time against a ghost of his best.
- **Pika haystacks.** In the larch basin and on the moraine, the pika's little piles of drying grass under the boulders, which a curious visitor can click.
- **Cloud shadows** drifting across the map on the wind, slow and soft, darker over the meadow, so the land never sits completely still.

- **A Flag on the Register** (round 5, B2). Once a visitor has finished all three and can sign, the register's lid stands open a crack or a small red flag goes up on its post, like a mailbox, so they know without opening it.
- **The Owl Answers** (round 5, B6). Clicking the owl on its limb turns its head all the way round and gives a soft two-note hoot, and at Dusk its eyes catch the light like the deer's.
- **Elk on the Move** (round 5, D1). Now and then the herd crosses the bottom trail in single file in front of TJ, and he stops on the trail to let them pass before walking on.
- **Ice Calving into the Moraine Lakes** (round 5, D2). Now and then a block of ice drops off a snout into its moraine lake with a soft splash and a ring, and a small floe drifts for a while.
- **Clouded Inflows** (round 5, D2). Where the milky streams run into Reflection Lake, a pale plume spreads into the clear water and fades, so you can see the glacier's flour arrive.
- **A Longer Swim** (round 5, D2). The lake is bigger now, so the swim to the island could pass a loon or a floating log on the way.
- **A Kingfisher on the Lake's Outflow** (round 5, D3). With the heron gone, a belted kingfisher could perch on a snag over the stream below the fall and rattle off downstream when TJ passes, a smaller, quicker riverside moment.
- **A Film That Repeats Exactly** (round 5, S1a). `frames.sh` would pause the page's clock, hold it still while the page loads, and seed the last few real-time choices, so two runs of the same code give the same pixels and "this change moved nothing" becomes a check a script can make.
- **Types Without a Port** (round 5, S1a). `// @ts-check` and a few JSDoc types on the modules the page talks to (`api` in `pixel.js`, `window.__info`) would have caught the plain page reading an undefined `MAP` at edit time.
- **Shorebirds at the River Mouth** (round 5, D5). At low tide a few sandpipers work the edge of the new channel on the flat, running ahead of the wash and lifting off together when the ferry sounds.
- **The Channel Moves With the Flow** (round 5, D5). The water in the beach channel and in the rivers could drift downstream a pixel at a time, so a river reads as running and not as a blue road.
- **The Fog Parts Along the Water** (round 5, D6). As the marine layer comes in, the fog could reach up each river valley first and lie along the water in the morning, then lift off the rivers last, the way valley fog does.
- **A Foghorn in the Marine Layer** (round 5, D6). While the fog lies on the sea, the ferry or a far lighthouse sounds a low horn now and then, so the weather can be heard as well as seen.
- **Someone Keeps the Lookout** (round 5, D7). A keeper could stand on the lookout's catwalk with binoculars by day and go in at Dusk when the window lights, and wave if TJ is in sight.
- **A Trail to the Lookout** (round 5, D7). A side trail could climb Off By One Peak to the tower, as a fourth short walk with the widest view on the map and a logbook in the cab.
- **Smoke on the Horizon** (round 5, D7). Once in a long while a thin smoke rises from the burn, and a light blinks from the lookout until it is out.
- **Flowers Follow the Season of the Walk** (round 5, D8). The one density field could take a season: avalanche lilies at the snow's edge early, lupine and paintbrush at the peak, and seed heads and red huckleberry leaves late, picked by the date or by a switch.
- **Bees and Butterflies Where the Flowers Are Thickest** (round 5, D8). A few butterflies and bumblebees could work the thickest drifts, placed by the same field, and lift off as TJ walks through.
- **A Debug View of the Fields** (round 5, D8). The Debug panel could tint the map by a chosen field (flowers, forest, dry side, fog), so a sketch like TJ's can be checked against the rule at a glance.
- **Larch Needles on the Tarns** (round 5, D9). The tarns beside a larch group could carry a scatter of gold needles on the water, drifting to the outflow.
- **Cottonwoods on the Dry Side's Rivers** (round 5, D9). With the aspens gone from the dry side, a few cottonwoods or willows could line the rivers where they cross the sage, as they do in the real Palouse and the coulees.
- **Alpenglow That Moves** (round 5, D10). At Dusk the pink light could climb the Legacy Range's snow over a minute and go out summit by summit, the way it does on a real range.
- **Two Free Colours** (round 5, D10). The palette has two colours left. A hazed grey pair for far rock would let the distant ranges sit further back without the dithered haze.
- **A Cloud Cap on the Tooth** (round 5, D11). Now and then a small banner cloud could trail east off Little Tahoma's tip while the summit wears its lens cloud.
- **Hand Over Hand on the Rungs** (round 5, D12). On the map TJ could climb the rungs with his own climbing frames, slower than he walks, and a goat could watch from the lip.
- **A Log Jam at the River's Mouth** (round 5, D13). Where the biggest river meets the sea, a dozen logs could pile against each other, the way they do at the mouth of a real coastal river.
- **Walk the Logs** (round 5, D13). In a free explore mode TJ could balance along a driftwood log, arms out, and hop off its end.
- **Logs That Float on a High Tide** (round 5, D13). On the highest tide one or two logs nearest the water could lift, drift a few pixels and settle somewhere new when the water goes out.
- **Wands Across the Ice** (round 5, D14). The boot track from the moraine to the island could be marked with a few bamboo wands with small flags, as a real glacier crossing is, so the way reads at a glance.
- **TJ and Kayti at the Tent on the Map** (round 5, D14). When the Spires walk is finished, two tiny figures could sit by the tent on the island, and the stove's smoke would have someone to cook for.
- **A Camp Light You Can See From the Trailhead** (round 5, D14). At Dusk the tent's glow could be the one warm light on the whole glacier, bright enough to pick out from the opening view.
- **Goats on the Island** (round 5, D14). A goat could wander onto the island for the salt while nobody is home, as the camp scene's goats keep to their knoll.
- **The Water Audit as a Check** (round 5, D4). `check.sh` could walk every stream's line and fail when a point of it is not water in the picture, so a change to the land can never again leave a stream cut in two without anyone looking.
- **Baked Against Fresh as a Check** (round 5, D4). `bake.sh` could compare what the page reads from `ground.png` with what the land works out fresh (the fall, the trails, every sign's place) and refuse to write a bake that disagrees. The doubled waterfall was this kind of fault.
- **An Outlet for the Lone Tarn** (round 5, D4). The small lake above the two far moraine lakes has no stream. A thread of water down to the nearer lake would tie the whole plateau into one chain.
- **A Swimming Hole** (round 5, D4). The pond on the east creek is now a level pool above a fall, the kind of place people swim. A rope swing on a branch, or a towel on a rock, would say so.
- **Dippers at the Falls** (round 5, D4). A small grey bird could bob on a rock at the foot of each fall and fly low up the stream when TJ comes near.
- **The Sweep as a Check** (round 5, E1). `check.sh` could run the sea sweep for a few hundred seconds and fail if the ferry or an orca is ever short of water, so a change to the coast or the tide cannot bring the grounding back unseen.
- **The Ferry Sounds Its Horn at the Corner** (round 5, E1). Where its lane bends round the bared flats at low water, one long blast, as a real ferry gives on a blind turn.
- **A Calf in the Pod** (round 5, E1). A fifth, small orca could keep to one cow's side, on the same lane a little inshore of her, and surface twice as often.
- **Lanes for the Birds** (round 5, E1). The same two-lane idea would let a line of pelicans or cormorants fly the coast just outside the surf at any tide.
- **A Bloom of Jellies** (round 5, E2). Once in a long while forty small jellyfish could drift through together on the current, a pale cloud in the water that the ferry parts.
- **Jellies That Glow at Dusk** (round 5, E2). At Dusk each jellyfish could carry one soft light pixel that pulses with its bell.
- **A Sea Turtle After the Jellies** (round 5, E2). A leatherback could surface near a jellyfish now and then, as they do off this coast in late summer, and the jellyfish would be gone when it dives.
- **Stranded on the Flats** (round 5, E2). When the tide goes out, one jellyfish could be left on the wet sand as a clear blob, there until the water comes back.
- **Look Into the Pool** (round 5, E3). Tapping the tide pool could open a close view of it, the way a climb opens its wall: the same animals drawn large, with a hermit crab changing shells.
- **An Oystercatcher at the Pools** (round 5, E3). A black bird with a long orange bill could work the flats at low water, walk from pool to pool and fly off as the tide turns.
- **The Anemones Close** (round 5, E3). When a glint or the crab passes over an anemone it could pull its tentacles in for a few seconds and open again.
- **Sea Stars That Walk** (round 5, E3). Over a whole low tide a sea star could cross a few pixels of its pool, too slowly to see unless you come back.
- **A Different Pool Each Visit** (round 5, E3). The big pool's animals could be dealt from a longer list each visit (a nudibranch, a chiton, a gunnel), so it is worth checking again.
- **Rings on the Water** (round 5, E4). Now that each streak of drizzle lands on a spot of the map, one that lands on a lake, a river or the sea could leave a small ring there for a moment.
- **Rain That Thins Toward Its Edge** (round 5, E4). The patches nearest the deck's front could deal a streak less often, so the drizzle tails off into dry air and never stops at a line.
- **A Gust Bends the Rain** (round 5, E4). When a gust crosses the forest, the streaks in its path could slant harder for a second, the way the trees already lean.
- **Elk Shake Off the Rain** (round 5, E4). An animal standing under the drizzle could shake itself once the deck lifts.
- **The Eagle Calls** (round 5, E5). A bald eagle's call is a thin, high chatter, nothing like the scream films give it. One short call as it lifts off would tell a visitor to look at the stacks.
- **Gulls Mob the Eagle** (round 5, E5). When the eagle circles, two of the gulls could break from their own circle and chase it for a lap, as gulls do.
- **The Eagle Robs the Osprey** (round 5, E5). Bald eagles steal fish from ospreys in the air. Once in a long while the eagle could cross to the lake, harry the osprey until it drops its catch, and take it.
- **An Osprey Nest on a Snag** (round 5, E5). A big stick nest on a dead tree's top in the forest west of the lake would give the osprey somewhere to come from and go to, and a second bird could sit on it.
- **A Missed Dive** (round 5, E5). One plunge in three could come up empty: the osprey shakes, circles once more and tries again.
- **Feathers on the Rock** (round 5, E5). After the eagle has eaten, a few pale specks could be left on the stack's top until the next rain washes them off.
- **A Young Eagle** (round 5, E5). A mottled brown bird with no white head could sit on a lower stack and watch the adult fish.
- **The Splash Has a Sound** (round 5, E5). The osprey's plunge deserves a short slap and hiss, heard only when the lake is on screen.
- **The Avalanche Seen From the Lake** (round 5, E6). The lake scene knows when a face slides on the map. It could show the slide too: a small white cloud pouring down the far mountain, and the rumble arriving late across the water.
- **Fresh Debris on the Glacier** (round 5, E6). The fan of snow at a glacier's foot could stay as a paler patch until the next snowfall, so a visitor can tell which face went last.
- **Climbers Wait It Out** (round 5, E6). Two tiny headlamps or dots on the summit dome could stop and wait while a face below them slides, then go on.
- **A Slide That Sets Off Its Neighbour** (round 5, E6). Now and then the cloud from one face could shake a cornice loose on the next, a small sluff a few seconds later that does not bare it.
- **The Order Tells a Story** (round 5, E6). The east face gets the morning sun first, so in the Day's first half it could be the likeliest to go, and the west face the likeliest toward Dusk.
- **The Squall From the Lake** (round 5, E7). The lake scene could show the cloud bank on the far summit and the snow falling from it, and its reflection going grey on the water.
- **The Squall Darkens the Meadow** (round 5, E7). While the cloud sits on the summit its shadow could dim the flower parkland below for those 20 seconds.
- **Graupel at the Trailhead** (round 5, E7). When the squall is at its height a few flakes could drift as far as the Trailhead and melt on the board.
- **A Snow Line That Moves** (round 5, E7). After a squall the snow could reach a few rows lower on the cleavers' rock for a minute and then draw back as it melts.
- **Thunder Snow** (round 5, E7). Once in a long while, one soft flash inside the cloud and a rumble a few seconds later.
- **The Lenticular Cloud Becomes the Squall** (round 5, E7). When the lenticular cloud is standing as a squall is due, it could thicken and sink onto the summit and become the squall's cloud, as cap clouds do before weather.
- **A Dust Devil You Can See From the Trailhead** (round 5, E8). The column is thin over the sage. It could be denser at the foot, carry a few sage leaves and twigs round it, and lay a faint shadow on the ground, so it reads at the default zoom.
- **Dust Devils Only on Hot Afternoons** (round 5, E8). They could spin up only in the middle of the day, when the ground is hottest, and never at Dusk or in the rain.
- **The Sheep Notice** (round 5, E8). When a dust devil passes within 40 px, the bighorn could lift their heads and step a few paces away.
- **A Dust Devil Picks Up a Tumbleweed** (round 5, E8). If a tumbleweed rolls into one, it could be carried round the column twice and thrown clear.
- **The Sow Stands Up When He Passes** (round 5, E9). As TJ walks the Spires trail past the clearing, the sow could rear up to look, and the cubs could bolt up the nearest trunk until he has gone.
- **A Cub Falls Off** (round 5, E9). One climb in ten, the cub could slip the last two pixels, land on its rump and shake itself.
- **Berries** (round 5, E9). The huckleberry bush in the clearing could be where the sow feeds: she strips it, and the berries are back the next morning.
- **Cubs Wrestle and Roll Together** (round 5, E9). The play could end in a tumble: both cubs in one ball rolling a few pixels downhill.
- **The Sow Calls the Cubs Down** (round 5, E9). When she moves off, she could stop, look back and huff (one soft sound) until the cub on the trunk is down.
- **The Forest-Edge Family Fishes** (round 5, E9). They stand by the creeks' meeting: the sow could wade in to her ankles and swipe at the water while the cubs watch from the bank.
- **A Field Checklist Find** (round 5, E9). "A sow and two cubs" could be a find, ticked by clicking the family. Held for TJ: finds are his to choose.
- **Bear Tracks** (round 5, E9). Where the sow has walked, faint prints could stay in the grass for a minute.
- **The Moose Wades** (round 5, E10). The bull could step into the river to his knees and lift his head with water weed hanging from his mouth, dripping.
- **Velvet and Shed** (round 5, E10). A second bull drawing with the antlers in velvet, or none at all, picked by the season if the map ever has seasons.
- **Rams Butt Heads** (round 5, E10). Now and then two bighorn rams could back off, rear and crack horns, with a sound that carries across the coulee.
- **Sheep on the Skyline** (round 5, E10). One sheep could stand at the very lip of the bench at Dusk, dark against the sky.
- **A Ewe and a Lamb** (round 5, E10). The band is four rams. A ewe with a lamb at her heels would use the same follow rule as the calf.
- **Animals Step Aside for TJ** (round 5, E10). Walkers may now cross the trail on their way: if TJ is coming, the animal could wait at the edge until he has passed.
- **The Old Sheep Ground** (round 5, E10). The head of the coulee is empty since the sheep moved. A coyote trotting through at Dusk would suit it. Held for TJ.
- **Calf Nurses** (round 5, E10). Wrong for a bull and calf, which TJ chose for the antlers: if a cow ever joins them the calf could nurse.
- **Marmots Answer Each Other** (round 5, E11). When one whistles, the other across the stream could sit up and answer a second later.
- **The Whistle Sends the Squirrels Running** (round 5, E11). A marmot's alarm when TJ comes near could make any squirrel within 80 px bolt.
- **A Marmot Flattens for the Eagle** (round 5, E11). If the eagle's shadow ever crosses the parkland, the marmots could drop flat and stay down until it has gone.
- **Marmots Wrestle** (round 5, E11). Two young marmots standing chest to chest and pushing, as they do on Rainier's meadows in July.
- **A Burrow** (round 5, E11). A dark hole beside each boulder that the marmot dives into when TJ comes within 20 px, and peers out of.
- **Whistle Marks** (round 5, E11). Two or three small curved lines by the marmot's mouth for the half second it whistles, for visitors with the sound off.
- **Pika Calls From the Talus** (round 5, E11). The same list of animal sounds could carry a pika's "eep" from the larch talus on the map.
- **Beard That Sways** (round 5, F1). The old man's beard on the forest's middle ground moving a pixel or two with the wind, as the near limbs' moss curtains could too.
- **Licorice Ferns on the Limbs** (round 5, F1). Small ferns growing out of the moss on top of the big limbs, as they do on bigleaf maples in the Hoh.
- **A Bigleaf Maple** (round 5, F1). One broad, many-armed maple in the middle ground, every arm sleeved in moss, to break the row of straight conifer trunks.
- **Devil's Club** (round 5, F1). A rainforest plant for the wet ground by the creek: big spiny leaves on tall canes. (Its partner, skunk cabbage, grows round the bog since round 6, C3.)
- **Drip From the Beard** (round 5, F1). After the shower event, a drop falling now and then from the tips of the hanging lichen.
- **Monolith Rises Over the Rim** (round 5, F2). As he climbs the legs, Mount Monolith's summit comes up over the rock band's rim, so the lakeshore's big view is promised before the scene changes.
- **The Fall's Roar** (round 5, F2). A waterfall sound in the forest scene that grows as he nears the rock band, over the forest's own ambience.
- **A Rainbow in the Spray** (round 5, F2). A faint arc in the mist at the fall's foot when the light shafts fall on it, by Day only.
- **A Dipper on the Pool** (round 5, F2). An American dipper bobbing on a stone in the fall's pool and diving in, as they do below every Cascade waterfall.
- **Walking Down the Legs** (round 5, F2). If the loop is ever walked the other way, the same legs taken downhill, with him leaning back.
- **Wet Rock Glints** (round 5, F2). A few pixels of the rock beside the fall catching the light now and then, where the spray keeps it wet.
- **A Bench at the Rim** (round 5, F2). A log bench where the top leg meets the rim, looking back over the forest's canopy.
- **The Moraine Lakes From the Shore** (round 5, F3). A notch in the far forest under each glacier, so a sliver of each milky moraine lake shows from the lakeshore.
- **The Inflows' Sound** (round 5, F3). A faint rush of water from across the lake when an inflow is in view and the scene is quiet.
- **Fish Rise at the Plume** (round 5, F3). The rings of rising trout gather where the silt plume meets clear water, as they do at real inlets.
- **The Mirror Breaks in Wind** (round 5, F3). A gust now and then that ruffles the whole lake for a few seconds, wiping out the mountain's mirror until it settles.
- **A Limb as a Frame** (round 5, F4). One mossy limb reaching in along the top of the map stop's view, so the forest still frames the lake without a trunk crossing it.
- **The Stop's View by Window Width** (round 5, F4). Clear the forest edge's giants by how wide the window is, so a very wide screen's stop is as clean as a laptop's.
- **The Legs on the Map** (round 5, F5). The map's trail climbing beside the outflow fall in a small zig-zag, so the map shows the switchbacks the scene walks.
- **Leaning on the Rail** (round 5, F5). If he stops on the lip's footbridge, he leans on the handrail and looks down the fall.
- **Spray on the Footbridge** (round 5, F5). The planks of the lower footbridge darker and shining where the fall's spray wets them.
- **Scenes Named on the Trail Map** (round 5, F5). The trail map's hidden stretch drawn as two parts with small labels, forest and lakeshore, now that each scene has its own part of it.
- **Crampons at the Ice's Edge** (round 5, G1). He stops for a second where the moraine meets the ice, puts crampons on, and his steps crunch from there to camp.
- **A Rope Team Up the Glacier** (round 5, G1). Three tiny figures on a rope far up the ice under the towers, moving a few pixels a second.
- **The Moulin** (round 5, G1). The meltwater channel ends in a blue hole in the ice with a low roar as he passes.
- **The Walk Turns to Face the Towers** (round 5, G1). In place of the cut to camp, the walk's last second swings the view round to camp's picture: the walls slide apart and the ice tilts up.
- **Boots Sound Different on Each Ground** (round 5, G1). Dirt, gravel and ice each with their own footstep, so the step onto the glacier can be heard.
- **The Glacier Table** (round 5, G1). One of the stones on the ice sits up on a pedestal of ice it has shaded from the sun.
- **The Tent Glows at Camp** (round 5, G2). At Dusk the tent in the walk and at camp glows from inside, as the map's tent does.
- **The Pot Boils** (round 5, G2). The stove's smoke turns to puffs of steam and the lid rattles now and then, with a small sound.
- **Ice Axes by the Tent** (round 5, G2). Two axes stuck in the snow beside the tent, one each, and a coiled rope on the rock.
- **Her Painting Keeps Up** (round 5, G2). The page on Kayti's knee gains a small flag on each tower he has climbed.
- **Snow That Melts With the Season** (round 5, G3). The patches a little smaller each time the visitor comes back, gone by the tenth visit, with flowers where they lay.
- **Glacier Lilies at the Snow's Edge** (round 5, G3). A ring of yellow lilies in the wet ground round each patch, as they come up where snow has just gone.
- **Footprints Kept in the Snow** (round 5, G3). His own prints stay in a patch after he has crossed it, until he leaves the scene.
- **Watermelon Snow** (round 5, G3). A faint pink stain on the oldest patch, the algae that grow on summer snow.
- **The Pika's Haystack** (round 5, G4). A small pile of drying flowers beside one pika's rock, which grows by a stem each time he passes.
- **Pika Answer Each Other** (round 5, G4). When one calls, the next one along the moraine answers a second later, further off and quieter.
- **The Marmot Hides Too** (round 5, G4). The marmots drop behind their rocks after whistling, the way the pika bolt, and come back up when he has gone.
- **A Weasel on the Moraine** (round 5, G4). Now and then a short-tailed weasel runs the crest ahead of him and every pika is out of sight before he gets there.
- **The Far Crest Kept Under the Six** (round 5, H1). On the map a crest behind the Spires shows over the wall between the second and third summits and reads as a seventh top. Lower it there so only the six break the skyline.
- **Heights on the Name Tags** (round 5, H1). Each summit's tag at camp shows a made-up height, trailhead's the greatest, so the order can be read as well as seen.
- **A Summit Cairn You Can See From Camp** (round 5, H1). A tiny cairn on each top he has stood on, beside the flag, growing with the cairn in that climb.
- **The Forecast Phone Is the Real App** (round 5, H2). The pop-up shows the app's real hour-by-hour strip for the next day at the Spires, fetched from Bluebird Forecast itself when the site is live.
- **Tap the Phone to Play the Forecast** (round 5, H2). Tapping the play button on his phone runs the slider forward early, and the weather clears early with it.
- **Wet Rock That Dries** (round 5, H2). The slabs are a shade darker while it rains and dry in patches from the top down as he climbs.
- **A Rainbow as the Lid Breaks** (round 5, H2). For a few seconds after the rain stops, a faint arc stands over the far peaks.
- **Other Shelterers Under the Boulder** (round 5, H2). A pika or a marmot is already sitting out the rain under the prow and shuffles over for him.
- **Big Pixel Words on Small Screens** (round 5, H2). A phone held sideways still draws scene words (BANG!, the forecast) at one screen pixel a dot. Draw every in-scene word at twice the size whenever a scene pixel is one screen pixel.
- **Rain on the Other Climbs** (round 5, H2). The drizzle can come over any climb now and then, by the same dice as the map's weather.
- **The Bluebird Lands on His Hat** (round 5, H3). On a second click it skips the station and perches on his beanie, and he looks up.
- **A Pair of Bluebirds** (round 5, H3). The female, grey with blue in her wings and tail, follows a second behind and takes the other box.
- **Bluebirds on the Map in Fair Weather** (round 5, H3). When the map's weather is clear, one sits on the Spires' signpost, and it is gone when the weather turns.
- **The Bird Reads the Station** (round 5, H3). While it sits on the box the anemometer stops, and it starts again when the bird leaves.
- **An Ice Screw Half Way Up** (round 5, H4). On the tall wall he stops once, places a screw and clips it, and the rope trails below him to the top.
- **Ice Chips Land on the Bench** (round 5, H4). The chips his tools knock off pile up as a small heap at the wall's foot while he climbs.
- **A Second Line on the Wall** (round 5, H4). On a return visit he takes the wall's other side, so the climb is not the same film twice.
- **The Watch Shows TJ's Real Last Workout** (round 5, H5). The watch's sync screen names the routine and the date of the last workout hevy-garmin-sync really moved, read from Hevy when the site is live.
- **Sets on the Watch at the Bench** (round 5, H5). While he presses, the watch counts the reps and shows the set, as a Garmin strength workout does.
- **Cut the Switchback** (round 5, H5). Tapping a corner makes him cut straight up to the next straight, and a marmot whistles at him for it.
- **Other Runners on the Trail** (round 5, H5). Now and then a runner comes down the switchbacks the other way, and they pass on a straight.
- **A Trail Kit for Every Fair-Weather Scene** (round 5, H5). The kit he wears could follow the weather: shorts on dry ground, the alpine kit on snow, changed at camp.
- **Fellfield on the Map Under hevy-garmin-sync** (round 5, H5). On the map the spire's south side could show the same turf and the zigzag of the trail, so the climb is announced before he starts it.
- **A Tyrolean Traverse Between Towers** (round 5, H6, TJ's alternative to the knife-edge). A rope strung between two towers, and he crosses hanging under it, hand over hand, with the drop under him. It reads cleanly from the side, which the knife-edge does not. For a future climb.
- **A Corniced Snow Ridge** (round 5, H6, TJ's alternative to the knife-edge). A snow crest with a cornice curling out over one side. He keeps well back from the edge, a piece of the cornice breaks off behind him and falls. For a future climb.
- **Stones Knocked Off the Knife-Edge** (round 5, H6). While he shuffles astride, a stone goes from under his hand and falls a long way into the haze, with a late clatter.
- **A Raven Under the Knife-Edge** (round 5, H6). A raven soars past below the crest, small against the haze, so the depth has something to measure it.
- **Cloud Filling the Gap** (round 5, H6). On some visits a bank of cloud lies under the knife-edge in place of the haze, level with the far ridges.
- **A Coin for the Binoculars** (round 5, H7). They are coin-operated: he drops a coin in with a clink before the view opens, and a small timer dial runs down without ever closing it.
- **Zoom in the Binoculars** (round 5, H7). The plus and minus keys (or a pinch) bring the cats twice as close.
- **Other Things to Find Through Them** (round 5, H7). Panned to its edge, the view shows something that is only there through the binoculars: the bear at the berries, or the elk in the meadow.
- **The Cats Look Back** (round 5, H7). After a few seconds in the view one cat turns and looks straight up the lens.
- **Keys for Every Scene** (round 5, H7). Now that a scene can take the keys, the register and the kiosk could use the arrows too.
- **Clip Only at the Walls** (round 5, H8). On the easy ground he walks with a hand on the cable and the lanyards slide along it. He stops to move them only at the foot and the top of each wall.
- **One Lanyard at a Time Shown Large** (round 5, H8). The first clip-in is shown close up once, like the phone and the watch, so the two-lanyard rule is understood and later ones can pass quickly.
- **A Climb Length Check** (round 5, H8). The check script prints every climb's length and warns when one goes over 30 s.
- **Glissade Into the Cloud** (round 5, H9). On Kubernetes-Manifests the slide down starts above the sea of cloud and drops into it, and he comes out underneath near the tent.
- **The Other Summits by Name** (round 5, H9). The peaks that stand out of the cloud are the other five climbs, each with its own shape and the thing on its top, so the view from one summit shows the rest.
- **A Brocken Spectre** (round 5, H9). At the cloud's top, with the sun behind him, his shadow falls on the cloud below inside a ring of colour.
- **Cloud Sea From the Map** (round 5, H9). On the days the map's weather is low cloud, the spires on the map stand out of it too.
- **A Cairn Everyone Builds** (round 5, H10). The count lives on the server and not in one browser, so every visitor's stone is on the same pile and the card says how many people have been up.
- **A Cairn That Widens** (round 5, H10). Past six stones the pile grows at its foot as well as its top, so a full cairn is a broad cone and not a thin stack.
- **The Cairn on the Map** (round 5, H10). The spire's summit on the map and on camp's backdrop shows the cairn at the height this visitor has built it.
- **A Stone From Each Place** (round 5, H10). The stone he adds is the colour of the last place he visited: basalt from the sea stack, granite from the lake, red rock from the Palouse.
- **A Clue That Changes Once Found** (round 5, H11). After the find, the card's last line says what happened ("You left a stone. 4 on the pile.") where it gave the clue.
- **Summit Marks on a Phone** (round 5, H11). Narrow screens show no marks on the timeline. The summit's name alone could be shown there, above the bar.
- **The Clue in the World** (round 5, H11). TJ's other option for T54: the hint drawn at the summit itself, such as a red light blinking on the rack or a coin slot glinting on the binoculars.
- **A Name on the Rungs** (round 5, I1). Hovering the rungs names them, with a nod to the ones above Snow Lake.
- **The Walk Up to the Rungs** (round 5, I1). The scene starts a few steps before the slab, on the lower trail, so the cliff is seen whole before he is on it.
- **A Hiker Coming Down** (round 5, I1). Now and then someone is on the rungs coming the other way, and he waits at the bottom for them.
- **Snow Lake Below** (round 5, I1). From the top of the rungs, a long blue lake shows far below and behind him for a moment as the picture pans.
- **Shrubs That Move in a Gust** (round 5, I2). The huckleberry leans a pixel with the larches when the gust comes through the basin.
- **Berries to Pick** (round 5, I2). A few shrubs carry blue berries, and he stops for a handful when one is clicked.
- **Huckleberry on the Map** (round 5, I2). The plateau on the map gets the same red shrubs in clumps, so the map and the larch basin agree.
- **A Frame Time Check That Runs Twice** (round 5, I2). The check script measures the frame time twice and takes the lower, so a busy workstation does not fail an item.
- **The Haystack Itself** (round 5, I3). A small heap of drying flowers under the pika's second rock that grows a little on each trip.
- **A Second Pika Answers** (round 5, I3). When this one calls, another calls back from the talus further up, heard and not seen.
- **A Check for Things in the Air** (round 5, I4). Each side scene can list what it places, and the check script tests that the pixel under every tree, rock and cairn is painted ground.
- **Strips That Size Themselves** (round 5, I4). `Strip` grows upward when a scene paints above its top, so no scene can cut its own ground off.
- **Gearing Up Seen** (round 5, I5). The leader racks cams onto his harness one at a time while the others walk over, and each one is on the rack he climbs with.
- **A Kit Change at the Packs** (round 5, I5). TJ arrives in his trail clothes and cap, and swaps the cap for his helmet at the packs, so his kit does not change between scenes.
- **Rope Flaked Out** (round 5, I5). The woman flakes the rope into a pile at the foot of the climb before anyone ties in, and the pile shrinks as the leader climbs.
- **Rope Stacked at the Belay** (round 5, I6). The rope taken in piles up in coils over the belayer's tether, and the pile runs out again as the next one climbs.
- **Belay Calls** (round 5, I6). A small word bubble at each handover: "On belay", "Climbing", "Off belay", gone in a second.
- **The Trailed Rope Snags** (round 5, I6). Once on the crest the orange rope catches behind a horn, and the woman flicks it free before TJ can follow.
- **Camera Keeps TJ in the Picture** (round 5, I6). On a narrow screen the view pulls back while someone else climbs, so TJ at the belay is never off the edge.
- **A Speed Control for the Climb** (round 5, I7). The boost key cycles the climb through 1, 2 and 4 times its pace, with the number shown beside the timeline.
- **Chalk Puffs at Speed** (round 5, I7). A small puff of chalk each time a hand goes to a new hold, so fast climbing reads as effort and not as sliding.
- **The Camera Leads the Climber** (round 5, I7). At this pace the view looks a little ahead of whoever is moving, so the next piece and the belay come into the picture before they are reached.
- **Glints on the Far Tarn** (round 5, I8). A few pixels of the big tarn's water sparkle on and off, more when a gust crosses the ridge.
- **The Tarn on the Map** (round 5, I8). The same tarn, with its island and outlet, drawn below Proficiency Peak on the world map, so the view from the climb is a place he can also see from above.
- **Cloud Shadows on the Basin** (round 5, I8). The shadows of the three fair-weather clouds drift slowly over the benches and darken the tarn as they pass.
- **A Tent by the Tarn** (round 5, I8). One tiny orange tent on the tarn's point, two pixels, for whoever looks closely.
- **A Shout from the Top** (round 5, I9). A small word bubble over the two on top with each heave ("Heave!"), and one over TJ as he comes off.
- **A Dropped Cam** (round 5, I9). As he is dragged past the big cam it slips from his hand and falls glinting into the cloud.
- **Sore Arms on the Summit** (round 5, I9). After the haul TJ flops down on the top instead of walking up for the first high five, and the leader comes to him.
- **The Haul on the Elevation Chart** (round 5, I9). The four yanks show as four steps on the timeline's elevation line.
- **Wisps Up the Tower** (round 5, I10). A few thin wisps run up the rock ahead of the rising cloud's edge, like fog climbing a face on a cold morning.
- **The Cloud on the Map** (round 5, I10). Once a visitor has seen the summit, the world map shows a small patch of cloud around Proficiency Peak's foot, gone after a while.
- **Shadow on the Sea** (round 5, I10). The tower casts a long faint shadow across the top of the cloud sea, away from the sun, longer at Dusk.
- **Spindrift** (round 5, I11). Now and then a little powder slides down the runnels past them on the snow slope.
- **A Last Look Back** (round 5, I11). The woman, last off the ledge, turns and looks up at the stuck rope before she steps onto the snow.
- **Axe Sounds** (round 5, I11). A soft thunk each time an axe goes in on the traverse, quieter for the two who follow.
- **The 404 as a Find** (round 5, J1). Clicking the digits in the fog counts as a find on the kiosk checklist (TJ's call, like every find).
- **Other Codes in Other Weather** (round 5, J1). A 500 in the smoke of a forest fire, if the site ever has a server error page.
- **The Page Written Out at Build Time** (round 5, J2). The release writes the page of text into `index.html` as plain HTML, so search engines and link previews read it without running the script.
- **Fonts From the Lockfile** (round 5, J3). Now that `web` serves the game, take the eight `@fontsource` packages as `web` dependencies copied in by `build.mjs`, so Renovate keeps them current and `tests/notices.test.ts` checks their licences.
- **Only the Letters Used** (round 5, J3). Subset Jersey 10, Tiny5 and Silkscreen to the characters the site's own words use, which could halve the 40 KB the first screen waits for.
- **The Walk in CI** (round 5, K1). Run `walk.sh`'s walk of every route as a Playwright test in the browser job, at 8x on the page's clock, so a stop that never lets him go fails the PR; time the heaviest views against 16.7 ms there too, and attach the sheet of stops to the run. The smoke test round 5 added (S1b) covers the start, a few points of each route and a clean console.
- **Views by Place, Not by Fraction** (round 5, K2). Give `refs.sh` views named by stop or scene (`stop=` or a scene's own start) instead of `p`, so two builds with different scene lengths still compare the same place.
- **Bake the Places Too** (round 5, K3). `habitat()` and the trail routing run on every start; their results could go into the bake beside the ground, which would take most of the remaining 70 to 90 ms back. Since round 6 (K3) the forest field, `forestAmt`, read for every pixel of land at each start, is the largest part of that.
- **Load Time in CI** (round 5, K3). The browser job could time the start three times and fail over 0.9 s, so a slow search like E8's is caught the day it lands.

## Round 6 (2026-11-21)

- **Seracs Off the New Icefall** (art pass, A01). The Spires' icefall is rows of serac columns now; the serac that falls on the map could break off one of those columns, leaving a gap that fills again over a minute.
- **Couloir Light at Sunset** (art pass, A02). The crests' snow couloirs could catch the sunset a step pinker than the rock round them, so the range's gullies glow for the minute of sunset.
- **The Shade Line Moves With the Sun** (art pass, A03). Mount Monolith's west half is lit and its east third in shade. At Dusk the shade line could swing west as the sun goes down, so the last pink light sits only on the summit and the west shoulder.
- **A Bared Icefall Shows Its Blue** (art pass, A03). The picture's big blue icefall shows only after an avalanche. When one bares, the blue could catch the light for a moment before the snow creeps back, so the visitor notices what slid.
- **Alpenglow on the Fin** (art pass, A04). Proficiency Peak's warm granite could be the last thing lit at Dusk, its planes glowing a step pinker than the grey crest behind, as granite does at sunset.
- **Larches on the Slabs' Edges** (art pass, A05). The basin's larches could grow along the slabs' cracks and the tarns' shores, as in the picture, instead of anywhere on the bench, so the groves follow the rock.
- **Waterfalls Down the Corners** (art pass, A06). The streams that leave the benches could fall down a corner of the wall, where water would run, rather than wherever their course meets the lip.
- **Trees Along the Hollows** (art pass, A07). The Palouse's few trees could stand in its hollows in short dark lines, as in the picture, rather than wherever the dry side's placement puts them, so they draw the swells' folds.
- **Stream Over the Coulee Lip** (art pass, A08). Where the dry side's stream reaches the coulee's rim it could drop down the basalt as a thin waterfall onto the talus, as the scablands' dry falls once did, rather than running down the cliff's slope as a plain line.
- **Plunge Pools** (art pass, A09). Each fall off a bench could land in a small round pool dug into the ground at its foot, dark in the middle with a pale rim, as in the picture, before the stream runs on. It changes the land, so it wants its own item and a walk of the routes.
- **A Stiller Lake at Dawn** (art pass, A10). The reflection could be sharp at first light and break up into ripples as the day's wind rises, so the time of day shows on the water as well as in the sky. It would have to move out of the ground into the scene's drawing.
- **Stones Off the Moraine** (art pass, A11). Now and then a stone could roll down a moraine's gullied bank and stop on the ice, a pixel or two of dust behind it, the way the banks shed in the afternoon sun.
- **Calving Ice** (art pass, A12). Now and then a slab could drop off a glacier's front into its tarn, a ring of pale water spreading where it lands and the slab floating for a while. That is new life on the map, so it waits for TJ.
- **Woodpeckers in the Burn** (art pass, A13). Black-backed woodpeckers come to burned forest for the beetles; one could tap now and then on a charred trunk. It is new life on the map, so it waits for TJ.
- **Bring the Pod Inshore** (art pass, A14). The orcas' lane runs along the map's west edge, where the camera stops, so they only ever show half cut off at the side of the screen. Setting their lane a little nearer the stacks, where the sea is still deep, would bring the pod into full view.
- **Pools Filling on the Flood** (art pass, A15). As the tide comes back, the sea could reach a pool's rim and spill over it in a thin white line before the pool goes under, rather than the pool fading out.
- **Logs Piled at the Drift Line** (art pass, A16). Where the beach widens, two or three logs could lie across one another in a heap, as they pile up at the top of the beach in winter storms, rather than each lying alone.
- **A Marmot That Ducks** (art pass, A17). When the runner passes close, the marmot sitting up could whistle and drop flat for a moment, as they do when a hiker comes near, before it sits up again.
- **One Cat Drawer** (art pass, A18). `makeCat` in `sprites.js` is an older cat that nothing draws any more; it could be deleted so the cats live only in `cats.js`.
- **The Trail Map Passes Axe** (art pass, B01). Axe run with the trail map sheet open finds low contrast in its intro band and project buttons smaller than the 24 pixel target size. Both were there before the register work; fixing them would let the register test run axe with the sheet open too.
- **The Pencil on the Page, From the Box** (art pass, B01). Once the visitor may sign, the kiosk view could show the pencil lying on the open book, as the page view does, so the box says the page is theirs before the click.
- **Climbers on the Wall** (art pass, C01). Now that the towers have clean faces, a climb under way could show as a tiny figure partway up its summit, seen from camp, as the map shows walkers on the trails.
- **A Rope Team on the Ice** (art pass, C02). The walk up the glacier could pass the boot track of a party ahead, and the crevasse fields give a reason for it to weave: the track could bend round the field nearest the trail instead of running straight.
- **One Block Language** (art pass, C03). The ridge's mass now bevels its blocks from all four sides, but the landmark blocks and the knob's heap still use the older two-planes-and-a-top shading. Giving `block()` the same rounded top edge and black crack would make every block on the ridge read alike.
- **Larches on the Slabs** (art pass, C04). The benches are humps now, so the mini larches could stand in the creases between slabs and in groves on the flatter backs, as in the picture, rather than wherever the old skyline put them.
- **Monolith at Its Own Size** (art pass, C05). The lake shows the map's picture of Monolith at three quarters, and any shrink of a dithered picture loses either its thin lines or its evenness. Painting the scene's mountain at 1:1 from the same functions, with its foot under the far forest, would keep every cleaver and streak crisp.
- **The Massif Seen From Each Summit** (art pass, C06). The towers behind every climb come from one strip with its own dice. Taking them from camp's `SPIRES` instead, the other five summits in their real order with the one he is on left out, would let each climb show its true neighbours.
- **Tufted Trees on the Map's Nearest Ranks** (art pass, D01). The tallest map conifers in the front ranks (35 to 42 pixels) could take the tufted layers too, where the plates start to show; the smaller ranks would keep them.
- **Long Breakers off the Sea Stacks** (art pass, D02). The picture shows two or three long white breakers parallel to the beach and lacy foam between them. Widening the shore band in `critters.js` would let the surf break further out; it would need its own frame-time check.
- **Aspen Groves That Flicker** (art pass, D03). Quaking aspen leaves shimmer in the lightest wind. The aspens' clusters could swap their lit and mid leaves now and then when the breeze is up, a pixel at a time, so a grove flickers gold while the pines beside it only sway.
- **Wind Running Over the Grass** (art pass, D04). The meadow's sunlit patches could drift slowly with the breeze, a lighter band passing over the turf the way wind combs a real meadow, drawn as a few pixels of the grass's top green over the bake.
- **The Kiosk's Map Shows Where You Have Been** (art pass, D05). The trail map pinned on the kiosk is a few pixels across; it could fill in a tan line for each trail once it has been walked, so the kiosk keeps score at a glance.
- **Rams That Butt Heads** (art pass, D06). Now the ram's horn reads, two rams on the coulee's ledges could back off and clash now and then in autumn, a two-frame lunge and a puff of dust, as bighorns do.
- **Ferry Lights at Dusk** (art pass, D07). Now the ferry has bands of windows, they could glow in the lamp ramp at Dusk, as the lookout's glass does, so the boat crossing the dark water is a string of lights.
- **Bushes Drawn at Twice the Size** (art pass, D08). The leaf clusters that lifted the trees could not fit a 14 by 10 bush. Bushes drawn at 20 by 14 near the viewer, as the huckleberry already scales with distance, would have room for them.
- **The Tent's Door Lit at Dusk** (art pass, D09). The picture's tents glow brightest at the open door. The tent glow could turn the door's pixels to the brightest lamp step instead of leaving them dark, so the doorway is the warmest spot at camp.
- **Cloud Shadows That Match the Clouds** (art pass, D10). The scenes' clouds now have a clear shape. Where a scene shows ground under open sky (the approach, the larches), each cloud could drop a slow shadow of its own outline on the slopes below, a step darker, drifting with it.
- **Sage That Leans in the Gust** (art pass, D11). When a tumbleweed rolls, the sage bushes along its roll could lean east for a moment with the same gust, a wave running ahead of the weed, so the wind that moves it shows on the flats.
- **A Squirrel's Tail That Flicks** (art pass, D12). Sitting squirrels flick their tails when they are wary. A second sitting drawing with the tail's curl a pixel higher, shown for a beat every few seconds or when the runner comes near, would make the meadow's squirrels look alive without moving them.
- **The Giants in the Stream** (art pass, E01). The picture's creek reflects the trunks standing over it. The stream's mirror is built from the bank and what stands on it, but the giants are drawn apart as tall things; adding their lower trunks to the still picture would put long dark trunk reflections in the water under each giant.
- **Flowers That Nod as He Passes** (art pass, E02). The flower spikes on the slope are painted into the strip. The few nearest the trail could be drawn as things instead, so the paintbrush and lupine bend aside for a moment where his legs brush them.
- **One Table for Every Scene** (round 8, A6). The signs' route times (`SECS`) and the lake's stand-ins (`LATER`) are two tables in `pixel.js`, each held to the scenes by a browser test. `make words` already writes a file from the content; a like step could write one table of every scene's length, stops and heights from the scenes themselves, so no number is typed by hand.
- **Prints That Fill In** (art pass, E04). On the off-route page his prints could fill in as the spindrift crosses them, the oldest first, so that if you wait the whiteout takes his tracks too.
- **A Calf on Every Stride** (art pass, E05). His legs are two-pixel lines from the hip to the foot. A pixel of calf behind the shin on the near leg, drawn from the knee the pose already works out, would give the run more spring without changing any pose.
- **The Register as a Scene** (TJ, 2026-11-22, in progress). The register opens on the box laid out like the generated picture (its prompt and seed in `design/art/register/log.jsonl`; the picture is beside the game on https://claude.ai/artifact/BUJyY8vSFXoKdRgZWpup7i), in the game's colours: a tall back wall with the map hanging on it, drawn from the world map; a pencil cup at its real size beside the book; the book lying open on the shelf at an angle, its pages showing the words they carry now. A click on the book zooms into the page to read and sign it, and a click on the map opens the Trail Map. TJ wants an artifact of it first. The second pass of H1 kept the flat book that fills the screen, which is why it could not look as deep as the picture.
- **A Lighter Ground** (round 6, A2). `ground.png` is 1.5 MB of the page's 2.1 MB. Saved as an indexed PNG (its pixels are palette indices already) or as WebP, it could be a third of that, and the first screen would come sooner on a phone.
- **Cache the Game for Good** (round 6, A2). `build.mjs` could put a short content hash in each module's name and rewrite the imports, so nginx can mark every file immutable as it did for Vite's assets, and a return visit loads nothing but the page.
- **Live Numbers on the Page of Text** (round 6, A2). The page of text could show each project's stars and release under its name, asked from `api` when the page opens, as the cards do.
- **When the Numbers Were Read** (round 6, A2). A project card could say "as of" the API's `fetchedAt`, small under the stars, so a stale count reads as stale. When the API can't be reached, the card shows the numbers baked into the game; it could say when those were read (the YAML says), so an old number never passes for a live one.
- **Axe on Every Scene** (round 6, A2). The browser suite runs axe on the world and the page of text; it could also run it on an open card, the trail map, the register and the debug menu.
- **Drafts Marked Line by Line** (round 6, A4). A card is a draft or not as a whole today, so a card with one line of TJ's and three of the planner's says "draft" over all of it. Now that the words are YAML, a `draft: true` beside one line (or a list of approved lines) could let the page of text and the card mark exactly the words TJ has not approved yet.
- **Words That Fit** (round 6, A4). A test could set every card's words in the card's own width and font (the browser suite already opens each one) and fail when a line TJ writes runs past the placard or wraps a plank, so an edit in `content/game/` can't break the layout unseen.
- **The Sun Sets on the Button** (round 6, B4). The clock button's sun could sink a pixel at a time through the 20 s sunset and the moon rise through the sunrise, so the button shows where in the cycle the world is, not only which half.
- **Hear a Track Before Picking It** (round 6, B4). Holding the pointer over a track in the music menu could play its first bar softly, the way the debug menu's sound test does.
- **Stop Labels That Read at a Glance** (round 6, B5; #33's last step). The timeline's stop labels are small tags above the bar; they could grow on hover, or show only the next stop's name in full, so the route reads at a glance without crowding a phone.
- **The Board Read in Place** (round 6, B5). The notice on the register box's back wall could carry the whole board when the screen is tall enough, as TJ's second idea in note 23 has it, and open the sheet only on a phone.
- **Follow the Event** (round 6, B6). After the view moves to a map event, it could keep following a moving one (the ferry, the orcas, the tumbleweed) until it ends, then ease back to him.
- **The 404 Clears as You Leave** (round 6, B7). The fog digits could thin and drift apart once he turns back along his tracks, so the page answers the click on "Back to the Trailhead" before the world changes.
- **The Cats Look Up** (round 6, B8). When the glissade starts with the binoculars up, the cats in the round view of the Trailhead could look up at the mountain once before the view closes.
- **The Rules Overlay** (round 6, I1). A debug toggle could tint every still drawing by what it is (rock, snag, log, driftwood, stack, fern, rail) and outline every solid foot, so a new piece that breaks a rule shows where it stands before the test says so.
- **Fireweed Seed Fluff** (round 6, I1). Late in a long visit, a few white tufts could drift off the burn's fireweed on the wind, the way the real plant goes to seed.
- **Their Own Dice** (round 6, C1). Each placement in `habitat()` could draw from dice of its own, seeded by its name, so growing a lake no longer moves the whale out at sea.
- **The Lake Holds the Sky** (round 6, C1). With more open water, the lake could mirror the clouds that pass over it, a pale shape drifting across its surface a few pixels at a time.
- **Meltwater Through the Gravel** (round 6, C2). Below each glacier snout the moraine band could carry a few braided threads of meltwater, sparkling now and then, that sink into the gravel before they reach the meadow.
- **Marmots on the Moraine** (round 6, C2). The moraine band's boulders are where marmots really live: one or two of the band's stones could get a marmot that sits up and whistles as the parkland's do.
- **Mist Over the Bog** (round 6, C3). At Dusk a low white mist could gather over the bog's pools and drift off between the trees, the way it does over real Olympic bogs.
- **A Banana Slug on the Cabbage** (round 6, C3). A tiny yellow slug could cross a skunk cabbage leaf now and then, as the forest scene's slug does at its own pace.
- **Tumbleweeds Pile on the Fence** (round 6, C4). A short run of fence at the Palouse's edge could catch the tumbleweeds that roll into it, two or three heaped against the wire, and a gust could free one now and then.
- **A Wheat Field on the Palouse** (round 6, C4). One patch of the gold hills could be a field in strips of stubble and green, with a combine crawling along a contour in the summer light, the way the real Palouse looks from Steptoe Butte.
- **A Rock Rattles Down the Scree** (round 6, C5). Now and then a block could break off the prow, bounce down the talus fan with a clatter, and settle among the others, with a puff of grit where it stops.
- **The Herd Answers the Bull** (round 6, C6). When the bull elk bugles, another bull far off across the parkland could answer a moment later, quieter, and the first could turn his head toward it.
- **Ravens Play With Anything** (round 6, C6). A raven could drop a twig in the updraft and catch it again, as real ravens do, now and then without a click.
- **A Marmot Census** (round 6, C6). The kiosk's checklist could count how many different animals you have made answer, not as finds but as a quiet tally in the corner of the board.
- **A Place Check in CI** (round 6, C7). `check.sh`'s list of where everything stands could be kept in the repo, so a pull request that moves a sign or an animal's home shows the move in its diff.
- **An Audit Test** (round 6, C8). The audit's measures (a plant on snow, ice or sheer rock; a sign on ground its name does not match) could become rules in `rules.js`, so the browser suite catches the next tree on a glacier on its pull request.
- **Spray on the Steps** (round 6, D1). The steps nearest the fall could glisten wet, with a drip of spray drifting across the climb when the wind turns.
- **A Rest on the Landing** (round 6, D1). If he stands still on a landing of the climb, he could sit on its stone and look at the fall, as he sits on the forest log.
- **Rain on the Canopy** (round 6, D2). A soft rain sound in the forest while the marine layer is in, heavier drops off the moss after it stops, and the stream a little louder.
- **Drips After the Rain** (round 6, D2). When the drizzle stops and the fog lingers, drops could fall from the moss on the limbs onto the trail, as they do on the map's rainforest crowns.
- **The Slug Moves On** (round 6, D3). Between visits the slug could have crawled a few pixels further along, with its slime trail longer by as much, so a return trip shows it went somewhere.
- **A Second Slug After Rain** (round 6, D3). Under the marine layer more slugs could come out onto the trail, as they do on wet days, and go again as it dries.
- **A Beam on the Runner** (round 6, D4). When he runs through a shaft, he could light up a step for the moment he is in it, so the light reads as in the air between you and him.
- **Morning Mist in the Shafts** (round 6, D4). Right after sunrise the shafts could be thicker and the dust denser, thinning as the day goes on.
- **Build the World Off the Main Thread** (round 6, D4 CI). The world's build blocks the page for about 6 s under Lighthouse's throttling, and Largest Contentful Paint sits near its 3 s budget. Building the land in a worker, or in slices between frames, would give the page room and stop the flaky runs.
- **A Rock Rolls in the Talus** (round 6, E1). Now and then a block he hops onto could rock under his foot with a clack, as loose talus does.
- **Pika in the Talus** (round 6, E1). A pika could call from between the blocks as he crosses, and dart into a gap; held for TJ, since a pika is already a find at the lake.
- **Spindrift Down the Couloir** (round 6, E2). Now and then a small slough of loose snow could pour down the couloir past him, and he would lean into the axe until it passes.
- **A Rep Count** (round 6, E2). The set on the bench could count its reps in tiny pixels over his head before the sync notice, in place of the watch's old lap count.
- **Places in the Binoculars** (round 6, E3). Panned over a named place, the binoculars could show its name under the round view, as the map does on hover.
- **A Coin Clink** (round 6, E3). The coin-operated binoculars could clink as he drops the coin in, and tick down with a little timer while they are open.
- **Rust on the Staples** (round 6, E4). A few of yggdrasil's staples could be rusty orange and one could wobble and creak when he steps on it.
- **A Back View on the Ladders** (round 6, E4). The icefall's ladder could be climbed with his back to us, as on the ice, if the ladder were drawn face-on and wide enough for him.
- **A Grunt on Each Heave** (round 6, F2). The haul and the stuck rope could have a small effort sound from the two hauling on each heave, as the summit has its cheer.
- **The Camera Pulls Back for the Haul** (round 6, F2). The camera could ease out to hold TJ and the two hauling in one frame while he is hauled, then close in again at the anchor.
- **Snow Off the Axes** (round 6, F3). Each swing of an axe on the walk-off could throw a puff of snow, as the ice chips fly on the icefall.
- **Straight On Where Trails Share** (round 6, G2). On the stretch where the peak's trail and the Spires' trail run together, sent from one to the other he could carry on to where they part instead of walking back to the Trailhead.
- **Handwriting That Follows the Curl** (round 6, H1). The register's pages now dip into the spine at the top; the lines and the handwriting could bow with them near the gutter, as the picture's book does.
- **The Map's Dot Follows You** (round 6, H1). The "you are here" dot on the register's map sits at the Trailhead. It could sit where you last were on the trails, so the kiosk remembers your walk.
- **A Frame-Time Check per View** (round 6, K3). `check.sh` times only the zoomed-out map at Dusk. It could time each scene at its heaviest moment as well, beside the last item's numbers, so a slow scene shows up on the item that made it, not at the round's end.
- **Planes for the Other Towers** (round 8, B1). Proficiency Peak's face is now a list of planes, each lit, shaded or facing front. The background needles and the Spires could be drawn from the same kind of list, so every tower in the world takes light the same way.
- **A Goat on the Ledge** (round 8, B2). The larch basin's walls now have a grassy ledge halfway up. One of the mountain goats' homes could be on it, where real goats like to stand.
