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
- **Fonts in the repo.** The four pixel fonts and the register's four handwriting faces come from Google Fonts. Hosting them with the site removes the outside requests and the moment of fallback text.

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

- **A smoke test for the prototype in CI.** A Docker job on every PR that walks each route headless, fails on any console error or on frame time over budget, and attaches a sheet of screenshots. It would turn "every route runs clean" from a claim in a report into a check that runs on its own.
- **A slow-phone check.** Round 4's frame times come from a fast machine in Docker. Measure at 4x CPU slowdown, and let the game drop its costliest layers by itself (mist detail, the zoomed-out redraw) when a frame runs long.
- **A link preview.** A page title, description and a preview image (a good render of the map at golden hour) so a link shared on LinkedIn or Slack looks like the site.
- **Reduced motion.** Follow the system's reduce-motion setting: gentler camera moves and fewer screen-wide effects.
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

