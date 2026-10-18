// Rule-based study coach for IDK.org.
//
// This is NOT an AI model. It has no network access, costs nothing to run, and
// cannot look up facts. It reads the learner's message for a simple intent
// (stuck, revising, planning, ...) and replies with study strategies that match
// the learning preference saved by the quiz. It never claims to be a
// diagnosis; the quiz only records preferences.
//
// The controller calls buildTutorReply(). Replacing this file with a real AI
// provider later will not change the API.

export const PREFERENCES = ['visual', 'auditory', 'readingWriting', 'handsOn'];

const PREFERENCE_LABELS = {
  visual: 'visual',
  auditory: 'listening and talking',
  readingWriting: 'reading and writing',
  handsOn: 'hands-on'
};

// Study strategies per preference. {topic} is replaced with the topic name.
const STRATEGIES = {
  visual: [
    'Draw a quick diagram or mind map of {topic}. Put the main idea in the middle and branch out from it.',
    'Use colours: one colour for key words and another for examples.',
    'Turn any steps into a flowchart or a timeline you can see on one page.'
  ],
  auditory: [
    'Explain {topic} out loud, as if you were teaching a friend. Notice where you get stuck.',
    'Record yourself explaining it, then listen back and fix the unclear parts.',
    'Study with someone: take turns asking each other questions about {topic}.'
  ],
  readingWriting: [
    'Write a short summary of {topic} in your own words, without copying the book.',
    'Make a list of key terms and write one sentence for each.',
    'Rewrite your notes as a question-and-answer list, then cover the answers and test yourself.'
  ],
  handsOn: [
    'Try one small example of {topic} yourself before reading more about it.',
    'Build or act out something simple that uses {topic}, even if it is messy.',
    'Break {topic} into a tiny task you can finish in 10 minutes, then do the next one.'
  ]
};

// Used when the learner has not taken the quiz yet: one idea from each style.
const GENERAL_STRATEGIES = [
  STRATEGIES.visual[0],
  STRATEGIES.auditory[0],
  STRATEGIES.readingWriting[0],
  STRATEGIES.handsOn[0]
];

const OPENERS = {
  greeting:
    "Hi! I'm your study coach. Tell me what you are learning and what feels tricky, and I will suggest ways to study it.",
  stuck:
    "Feeling stuck on {topic} is normal. It often means you are close to learning something new. Let's make it smaller.",
  revise:
    'Preparing for {topic} early is a good move. Short, repeated practice works better than one long session.',
  plan:
    'A simple plan helps. For {topic}, try study sessions of about 25 minutes with a 5 minute break, and pick one small goal for each session.',
  explain:
    "I can't look up facts yet, so I won't guess at answers. I can help you learn {topic} in a way that suits you.",
  general:
    "Thanks for your message. I can't look up facts yet, but I can suggest ways to study {topic} that suit you."
};

const INTENT_EXTRA = {
  stuck: 'First step: write the one part you do not understand in a single sentence.',
  revise: 'Whatever you try, test yourself without looking first, then check your answers.',
  plan: 'Write your plan down and tick off each session when you finish it.',
  explain: 'First step: write down what you already know about {topic}, even if it is only a little.',
  general: 'First step: write down what you already know about {topic}.'
};

const SUGGESTIONS_BY_INTENT = {
  stuck: "I'm stuck on this",
  revise: 'Help me revise',
  plan: 'Help me make a study plan',
  explain: 'How can I learn this?'
};

// Checked in order. The first match wins. Greeting is only used when nothing else matches.
const INTENT_RULES = [
  ['stuck', /\b(stuck|confus\w*|lost|struggl\w*|hard|difficult|(do not|don't|dont|cannot|can't|cant) (understand|get))\b/],
  ['revise', /\b(exam|exams|test|quiz|revise|revision|remember|memori[sz]e)\b/],
  ['plan', /\b(plan|schedule|timetable|routine|organi[sz]e|time management)\b/],
  ['explain', /\b(explain|what is|what are|how does|how do|how can|why|meaning|define)\b/],
  ['greeting', /^\s*(hi|hello|hey|salam|assalam\w*)\b/]
];

export const INTENTS = ['greeting', 'stuck', 'revise', 'plan', 'explain', 'general'];

export function detectIntent(message) {
  const text = String(message || '').toLowerCase();
  for (const [intent, pattern] of INTENT_RULES) {
    if (pattern.test(text)) return intent;
  }
  return 'general';
}

// Cleans a subject/topic label before it is echoed back: collapses whitespace,
// removes angle brackets and control characters, and limits the length.
export function cleanLabel(value, maxLength = 60) {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

const fill = (template, topicLabel) => template.replaceAll('{topic}', topicLabel);

// Picks up to three strategies: the primary preference first, then one from the
// secondary preference if there is one.
function pickStrategies(primary, secondary) {
  if (!PREFERENCES.includes(primary)) return GENERAL_STRATEGIES.slice(0, 3);
  if (PREFERENCES.includes(secondary) && secondary !== primary) {
    return [STRATEGIES[primary][0], STRATEGIES[primary][1], STRATEGIES[secondary][0]];
  }
  return STRATEGIES[primary].slice(0, 3);
}

// Builds the tutor reply.
//   message  - the learner's message (string)
//   subject  - optional subject label (string)
//   topic    - optional topic label (string)
//   ideotype - optional saved quiz result ({ primary, secondary, ... })
export function buildTutorReply({ message, subject, topic, ideotype } = {}) {
  const intent = detectIntent(message);
  const topicLabel = cleanLabel(topic) || cleanLabel(subject) || 'this topic';

  const primary = ideotype && PREFERENCES.includes(ideotype.primary) ? ideotype.primary : null;
  const secondary =
    primary && ideotype && PREFERENCES.includes(ideotype.secondary) && ideotype.secondary !== primary
      ? ideotype.secondary
      : null;
  const quizTaken = primary !== null;

  const steps = pickStrategies(primary, secondary).map(s => fill(s, topicLabel));

  const parts = [fill(OPENERS[intent], topicLabel)];
  if (intent !== 'greeting') {
    parts.push(fill(INTENT_EXTRA[intent], topicLabel));
    parts.push(
      quizTaken
        ? `Your quiz shows a ${PREFERENCE_LABELS[primary]} preference, so try these:`
        : 'Here are a few different ways to try:'
    );
    parts.push(steps.map((s, i) => `${i + 1}. ${s}`).join('\n'));
  }
  if (!quizTaken) {
    parts.push('Tip: take the short learning-preference quiz and I can match these tips to you.');
  }
  parts.push('What would you like to work on next?');

  const suggestions = Object.keys(SUGGESTIONS_BY_INTENT)
    .filter(key => key !== intent)
    .slice(0, 3)
    .map(key => SUGGESTIONS_BY_INTENT[key]);

  return {
    tutorMessage: parts.join('\n\n'),
    steps: intent === 'greeting' ? [] : steps,
    suggestions,
    mode: 'study-coach',
    intent,
    preference: primary,
    secondaryPreference: secondary,
    quizTaken
  };
}
