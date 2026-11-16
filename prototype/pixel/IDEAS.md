# Pixel MVP: ideas for later

Things that would make the pixel trailhead look, feel, perform and behave better, written during the overnight build of 2026-11-14. Nothing here is built. The site is a resume first and a game second, so each idea is judged by one question: does it help a visitor learn who TJ is, or enjoy finding out?

## Says more about TJ

- **Real numbers on the lake cards.** "In the mountains" could show this year's totals from Strava and Peakbagger (kilometres run, metres climbed, summits) the way the project cards show stars. A scheduled job writes them into a content file, so the page never calls those services.
- **A summit log.** A short list of recent peaks on the map card, each one a link to its Peakbagger page. It would turn "peakbagger" from a claim into evidence.
- **Work history as the approach.** The 0.6 km walk to The Stack is empty today. Trail signs along it could name the places TJ has worked, oldest first, so the walk in is the career and the wall is the skills.
- **A fourth pitch for leadership.** The Stack covers platform, reliability and software. Mentoring, hiring and running a team have no card. A belay ledge where he brings up a second climber would show it without a paragraph.
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
- **More of the forest's lushness in the alpine scenes.** The climbs are the sparest scenes. Cornices, crevasse fields seen from above, spindrift off the ridges and a lenticular cloud would bring them up to the forest.
- **A proper knife-edge.** The Bluebird route is a snow slope in a storm. The PRD asks for a ridge with drops on both sides, which needs a camera that looks along the ridge instead of at its side.
- **Smoother walking.** Six frames for the run and four for the walk. Eight and six would take the stutter out at the cost of an hour of pose work.
- **Animated water on the map.** The lake and the glacier melt on the world map are still. The lake scene already has the technique.

## Feels better

- **Choose your own pace.** Space starts and stops, but there is one speed. Holding Shift for a walk, or tapping twice for a sprint, would let a reader linger.
- **The fall, driven.** The lead fall on pitch two always happens. Letting the visitor pick a hold (one solid, one that breaks) would make the catch land harder, and the reliability card with it.
- **A glissade you steer.** Left and right during the slide down from each summit, with nothing to win or lose.
- **Cats that follow.** One of them could trot a little way down whichever trail he takes, then give up and sit.
- **Touch gestures.** Swipe along the bottom to scrub, swipe up on a card to dismiss it, pinch on the trail map to zoom.
- **Gamepad.** The whole site needs five inputs. A controller would suit it.
- **Photo mode.** A key that hides every panel and saves the frame as a PNG at a chosen scale.

## Behaves better

- **Real addresses.** The `#name` addresses work, but real paths (`/the-stack/summit`) are better for sharing and for search engines. The server needs one rule to send every path to the same page.
- **A link preview per card.** A picture and a sentence for each address, so a shared link to a project shows that project.
- **Screen reader pass.** The plain page covers reading. The world itself announces cards, but the events (the fall, the eggs) are silent. Short spoken lines for each would close the gap.
- **Reduced motion.** With that setting on, scene changes should cut instead of closing a round window, and the map's idle camera should hold still.
- **Remember where he was.** Coming back to the site could offer "carry on from pitch two" instead of starting at the Trailhead.
- **Translations.** All copy lives in `content.js`, so a second language is one more file.
- **Tests that look.** One screenshot per scene compared with a stored one in CI would catch the kind of slow decline the 3D prototype suffered.

## Performs better

- **Draw only what changed.** Every scene repaints every pixel on every frame. Most frames differ in a few hundred pixels. Keeping the still layers and repainting only the moving parts would cut the work by most of it, which matters on phones.
- **Pause when hidden.** Stop drawing and stop the music when the tab is in the background.
- **Build scenes off the main thread.** The forest and the wall take a moment to paint at load. A worker could paint them while the map is already on screen.
- **A smaller first load.** The page is about 330 KB of script with no build step. Minified and compressed it would be near 70 KB, and the three fonts could be cut down to the letters in use.
- **Fonts in the repo.** The four pixel fonts come from Google Fonts. Hosting them with the site removes the outside request and the moment of fallback text.

## Sound

- **Music that follows the place.** The five tracks are picked at random. Tying one to each place (and cross-fading at the scene change) would make the music part of the map.
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
- **A marine layer.** Some visits open with low cloud filling the west below the crest, burning off over a few minutes.
- **An otter in the river** below the waterfall, on its back.

### Places and scenes

- **Carry on along the ridge.** After a Spires summit, offer the ridge to the next summit as well as the glissade to camp, so a keen visitor can link all six as one traverse.
- **The work history as the larch approach.** Cairns or signs along the larch basin scene could name the places TJ has worked, oldest first (see "Work history as the approach" above, which was written for The Stack's walk-in).
- **The summit register on Proficiency Peak.** A small box on top that he signs, as a thing to find.
- **A second lake scene at Dusk**: alpenglow on the mountain and its mirror, the one postcard view of the site.
- **The tide pools up close.** Tapping a pool at low tide could open a small close-up with its animals named.

- Taking turns on the West Ridge: who leads each pitch, and which follower climbs second, drawn at random per visit. TJ's first wish; set aside in round 4 so only the black-haired man needs the leading and falling drawings.
- A shivering belayer on the West Ridge: when the scene looks windy and cold, whoever is belaying visibly shivers while waiting for the climber (TJ, 2026-11-15; not part of the round 4 build).
- **The eyes in the fog as a thing to find.** Tapping a pair of eyes at Dusk before they blink out could count as a find, with a short line in the voice of the rainforest. The owl could hoot (a soft `audio.js` call) when tapped.

### Page and feel

- **A photo mode.** One key hides every sign and card for a clean screenshot of the view.
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
- **The summit register.** A small tin box under the top boulder that TJ opens to sign, the way many summits keep a register, with the list of earlier names as a place to put credits or thanks.
