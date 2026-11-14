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
