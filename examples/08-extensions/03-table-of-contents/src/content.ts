import type { PartialBlock } from "@blocknote/core";

function heading(level: 2 | 3, text: string): PartialBlock {
  return { type: "heading", props: { level }, content: text };
}

function paragraph(text: string): PartialBlock {
  return { type: "paragraph", content: text };
}

function bullet(text: string): PartialBlock {
  return { type: "bulletListItem", content: text };
}

export const content: PartialBlock[] = [
  heading(2, "Choosing a site"),
  paragraph(
    "Most vegetables need six to eight hours of direct sun a day. Watch the plot through a whole day before you dig: a fence or a tree that looks harmless in the morning can shade half of it by the afternoon.",
  ),
  heading(3, "Sunlight"),
  paragraph(
    "Leafy greens and herbs cope with partial shade, fruiting crops such as tomatoes, peppers and squash do not. Put the tallest plants on the north side so they don't shade the rest.",
  ),
  paragraph(
    "If the only sunny spot is a patio, grow in containers: they warm up quickly in spring and can follow the light as the season changes.",
  ),
  heading(3, "Water and wind"),
  paragraph(
    "A tap or a rain barrel within reach of a hose saves more time than anything else in the garden. Avoid low spots where cold air and water collect, and give exposed sites a hedge or a fence to break the wind.",
  ),
  heading(3, "Access"),
  paragraph(
    "Put the beds where you pass every day. A garden by the back door gets weeded, watered and picked; one at the far end of the lawn is forgotten by midsummer.",
  ),
  heading(2, "Planning the beds"),
  paragraph(
    "Sketch the plot on paper before you buy a single seed. Mark where the sun falls, where the tap is and where you will walk, then fit the beds around them.",
  ),
  heading(3, "Bed size"),
  paragraph(
    "Keep beds narrow enough to reach the middle from either side, about 1.2 metres, so you never have to step on the soil and compact it.",
  ),
  paragraph(
    "The paths between them need to fit a wheelbarrow. Anything narrower turns every load of compost into two trips.",
  ),
  heading(3, "Raised beds"),
  paragraph(
    "Raised beds drain well, warm up early in spring and save your back. They are worth the cost on heavy clay or where the soil is poor; on good ground, beds raised by digging out the paths are enough.",
  ),
  heading(3, "Crop rotation"),
  paragraph(
    "Grow each family of crops in a different bed each year, so the pests and diseases that build up in the soil don't find their host waiting for them.",
  ),
  bullet("Year one: beans and peas, which leave nitrogen behind"),
  bullet("Year two: leafy crops such as cabbage and kale, which use it"),
  bullet("Year three: roots such as carrots, beetroot and potatoes"),
  heading(2, "Preparing the soil"),
  paragraph(
    "Good soil is crumbly, drains well and is full of organic matter. Few gardens start that way, but every season of compost brings them closer.",
  ),
  heading(3, "Testing"),
  paragraph(
    "A simple kit tells you the pH and the main nutrients. Most vegetables like a pH between 6 and 7; lime raises it, sulfur lowers it, and both take months to work.",
  ),
  heading(3, "Adding compost"),
  paragraph(
    "Spread five centimetres of compost over the beds every autumn and let the worms work it in over winter. Digging it in is optional; the soil keeps its structure better when you don't.",
  ),
  bullet("Garden compost, once it is dark and smells of earth"),
  bullet("Well-rotted manure, at least a year old"),
  bullet("Leaf mould, for a gentler feed"),
  heading(3, "Making your own compost"),
  paragraph(
    "Mix green material, such as grass clippings and kitchen scraps, with brown material, such as dry leaves and shredded cardboard, in roughly equal amounts. Keep the heap as damp as a wrung-out sponge.",
  ),
  paragraph(
    "Turn it every few weeks to let air in. A well-tended heap is ready in three months and a neglected one in a year; both get there in the end.",
  ),
  heading(3, "Drainage"),
  paragraph(
    "Dig a hole thirty centimetres deep, fill it with water and see how long it takes to drain. More than a few hours means roots will sit in water after every rain, and the bed should be raised.",
  ),
  heading(2, "Choosing what to grow"),
  paragraph(
    "Grow what you like to eat, and what costs the most to buy fresh. A packet of salad seed gives more than a dozen bags from the shop.",
  ),
  heading(3, "Easy crops for beginners"),
  paragraph(
    "Some crops forgive almost any mistake and give a harvest in the first season:",
  ),
  bullet("Radishes, ready to pull in four weeks"),
  bullet("Lettuce and other salad leaves, picked a few leaves at a time"),
  bullet("Courgettes, which produce more than any family can eat"),
  bullet("Runner and French beans"),
  heading(3, "Varieties"),
  paragraph(
    "Seed catalogues list dozens of varieties of each crop. Look for ones marked as disease resistant or suited to your climate; the local allotment society usually knows which do well in your area.",
  ),
  heading(2, "Planting"),
  paragraph(
    "Check the last frost date for your area and count back from it. Seed packets say how many weeks before or after that date each crop goes in.",
  ),
  heading(3, "Sowing seeds"),
  paragraph(
    "Sow at a depth of about twice the seed's width and keep the soil moist until the seedlings are up. Thin them early: crowded seedlings grow into weak plants.",
  ),
  heading(3, "Starting seeds indoors"),
  paragraph(
    "Tomatoes, peppers and aubergines need a longer season than most summers give them. Start them on a sunny windowsill six to eight weeks before the last frost, in small pots of seed compost.",
  ),
  paragraph(
    "Seedlings that stretch towards the glass and flop over need more light. Turn the pots every day, or move them under a grow lamp.",
  ),
  heading(3, "Transplanting"),
  paragraph(
    "Harden seedlings off for a week by putting them outside for a little longer each day. Plant on a cloudy afternoon and water them in well.",
  ),
  heading(3, "Spacing"),
  paragraph(
    "Follow the spacing on the packet even when the bed looks empty. Plants set too close compete for water and light, and the still air between them invites mildew.",
  ),
  heading(2, "Watering"),
  paragraph(
    "Water deeply and less often, so the roots grow down instead of staying near the surface. Early morning is best: less is lost to the sun, and the leaves dry before evening.",
  ),
  paragraph(
    "A layer of mulch keeps the soil moist for days longer and smothers the weeds that would compete for that water.",
  ),
  heading(3, "How much water"),
  paragraph(
    "Most crops need about two and a half centimetres of water a week, from rain and the hose together. Push a finger into the soil: if it is dry down to the second knuckle, it's time to water.",
  ),
  heading(3, "Watering systems"),
  paragraph(
    "Soaker hoses and drip lines put the water at the roots and nowhere else. Fitted with a timer, they keep the garden going through a week's holiday.",
  ),
  heading(2, "Feeding"),
  paragraph(
    "Compost alone feeds most crops. Hungry ones, such as tomatoes, squash and sweetcorn, do better with an extra feed once they start to flower.",
  ),
  heading(3, "Liquid feeds"),
  paragraph(
    "A tomato feed high in potash, diluted in the watering can every week or two, keeps fruiting crops producing until autumn. Comfrey or nettles steeped in a bucket of water for a month make a free alternative, if a smelly one.",
  ),
  heading(3, "Green manures"),
  paragraph(
    "Sow clover, mustard or winter rye on beds that would otherwise stand empty. Cut them down before they flower and leave them on the surface to rot: they protect the soil over winter and feed it in spring.",
  ),
  heading(2, "Mulching and weeding"),
  paragraph(
    "Bare soil doesn't stay bare for long. Cover it with mulch, or the weeds will cover it for you.",
  ),
  heading(3, "Choosing a mulch"),
  paragraph(
    "Straw, shredded leaves and grass clippings all work, laid five to ten centimetres deep around established plants. Keep it a hand's width away from the stems, where it holds damp and invites rot.",
  ),
  heading(3, "Keeping on top of weeds"),
  paragraph(
    "Hoe on a dry, sunny morning, slicing the weeds just below the surface, and leave them to wither. Ten minutes twice a week does more than an afternoon once a month.",
  ),
  paragraph(
    "Weeds pulled before they set seed don't come back next year. One year of seeding, as the old saying goes, is seven years of weeding.",
  ),
  heading(2, "Pests and diseases"),
  paragraph(
    "A garden with healthy soil and a mix of plants has fewer problems than one planted in long rows of a single crop. Check the plants every few days: most pests are easy to deal with while they are few.",
  ),
  heading(3, "Slugs and snails"),
  paragraph(
    "Go out with a torch on a damp evening and pick them off. Beer traps, copper tape and a ring of grit around young plants all help, and frogs, birds and beetles do the rest if the garden gives them somewhere to live.",
  ),
  heading(3, "Aphids"),
  paragraph(
    "Squash small colonies between finger and thumb, or knock them off with a jet of water. Ladybirds and lacewings arrive within weeks of the first aphids, so don't spray and kill them too.",
  ),
  heading(3, "Fungal diseases"),
  paragraph(
    "Powdery mildew, blight and rust spread in still, damp air. Space plants well, water the soil rather than the leaves, and remove infected leaves as soon as you see them. Don't put them on the compost heap.",
  ),
  heading(3, "Companion planting"),
  paragraph(
    "Marigolds among the tomatoes, nasturtiums by the beans and onions alongside the carrots confuse pests that find their food by scent, and the flowers draw in the insects that eat them.",
  ),
  heading(2, "Supporting and pruning"),
  paragraph(
    "Tall and climbing crops need support before they need it: a stake pushed in later spears the roots.",
  ),
  heading(3, "Stakes and canes"),
  paragraph(
    "Tie tomatoes to a stake every thirty centimetres as they grow, using soft string in a loose figure of eight. Beans and peas climb wigwams of canes or netting by themselves once they find them.",
  ),
  heading(3, "Pinching out"),
  paragraph(
    "Cordon tomatoes grow a side shoot in the angle between each leaf and the main stem. Pinch them out while they are small, so the plant puts its energy into fruit instead of leaves.",
  ),
  heading(2, "Harvesting"),
  paragraph(
    "Pick often. Beans, courgettes and herbs produce more the more you take, and vegetables picked young are the most tender.",
  ),
  heading(3, "When to pick"),
  paragraph(
    "Pick in the cool of the morning, when the plants are full of water. Most crops tell you when they are ready: beans snap cleanly, tomatoes give slightly when pressed, and courgettes are best at the length of your hand.",
  ),
  heading(3, "Storing the harvest"),
  paragraph(
    "Onions, garlic and winter squash keep for months somewhere cool and dry. Leafy crops are best eaten within a day or two.",
  ),
  heading(3, "Preserving"),
  paragraph(
    "Freeze beans and peas within hours of picking, after a minute in boiling water. Gluts of tomatoes become sauce, cucumbers become pickles and soft fruit becomes jam.",
  ),
  heading(2, "Saving seeds"),
  paragraph(
    "Seed from open-pollinated varieties grows into plants like the parent; seed from F1 hybrids does not, so check the packet before you save.",
  ),
  paragraph(
    "Let a few of the best plants go to seed, collect the seeds on a dry day and store them in labelled paper envelopes somewhere cool and dark. Beans, peas, tomatoes and lettuce are the easiest to start with.",
  ),
  heading(2, "Putting the garden to bed"),
  paragraph(
    "Clear away spent crops once the first frosts have finished them, and add the healthy ones to the compost heap.",
  ),
  heading(3, "Autumn tasks"),
  bullet("Spread compost over the empty beds"),
  bullet("Sow green manures, or cover the soil with cardboard"),
  bullet("Clean and oil the tools before putting them away"),
  bullet("Plant garlic and overwintering onions"),
  heading(3, "Looking ahead"),
  paragraph(
    "Order seed in winter, while the catalogues are full and the choice is widest.",
  ),
  paragraph(
    "Write down what grew well and what didn't. Next year's garden starts with this year's notes.",
  ),
];
