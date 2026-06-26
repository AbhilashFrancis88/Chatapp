export const USERS = [
  { id: 'alice', name: 'Alice', initials: 'AL', color: '#E1F5EE', textColor: '#0F6E56' },
  { id: 'bob',   name: 'Bob',   initials: 'BO', color: '#FBEAF0', textColor: '#993556' },
  { id: 'carol', name: 'Carol', initials: 'CA', color: '#FAECE7', textColor: '#993C1D' },
  { id: 'dave',  name: 'Dave',  initials: 'DA', color: '#E6F1FB', textColor: '#185FA5' },
];

export const CHANNELS = [
  { id: 'general', name: 'general',  icon: 'ti-hash' },
  { id: 'random',  name: 'random',   icon: 'ti-hash' },
  { id: 'dev',     name: 'dev-talk', icon: 'ti-code' },
  { id: 'design',  name: 'design',   icon: 'ti-palette' },
];

export const SAMPLE_MESSAGES = {
  general: [
    { id: 1, user: 'alice', text: 'Good morning everyone! 👋', time: Date.now() - 600000 },
    { id: 2, user: 'bob',   text: 'Morning Alice! Ready for the standup?', time: Date.now() - 560000 },
    { id: 3, user: 'carol', text: 'Just joined. What are we covering today?', time: Date.now() - 540000 },
    { id: 4, user: 'alice', text: 'Mainly the new feature rollout and some perf issues we spotted yesterday.', time: Date.now() - 510000 },
    { id: 5, user: 'dave',  text: 'I can share the perf dashboard during the call. Found some interesting patterns.', time: Date.now() - 480000 },
    { id: 6, user: 'bob',   text: "Sounds great, let's do it!", time: Date.now() - 460000 },
  ],
  random: [
    { id: 1, user: 'carol', text: 'Anyone tried that new coffee place downtown?', time: Date.now() - 900000 },
    { id: 2, user: 'dave',  text: 'Yes! Their cold brew is incredible ☕', time: Date.now() - 880000 },
    { id: 3, user: 'alice', text: 'Adding it to my list!', time: Date.now() - 850000 },
  ],
  dev: [
    { id: 1, user: 'dave', text: 'Just pushed the new branch. Ready for review.', time: Date.now() - 1200000 },
    { id: 2, user: 'bob',  text: "On it. I'll take a look this afternoon.", time: Date.now() - 1180000 },
  ],
  design: [
    { id: 1, user: 'alice', text: 'Figma file updated with new components', time: Date.now() - 3600000 },
    { id: 2, user: 'carol', text: 'Love the new icon set! 🎨', time: Date.now() - 3580000 },
  ],
};

export const BOT_REPLIES = {
  general: [
    "That's a great point!",
    'Totally agree with that.',
    'Let me check and get back to you shortly.',
    'Thanks for the heads up!',
    'Can we sync on this after the call?',
    'Just updated the doc. Have a look when you can.',
    'Done! Pushed the fix 🚀',
    'Looks good to me 👍',
  ],
  random: [
    'Haha, same here!',
    "Weekend can't come soon enough 😄",
    "That's hilarious 😂",
    'Sounds like fun!',
  ],
  dev: [
    'PRs are looking clean.',
    'Just ran the tests — all passing ✅',
    'We might want to refactor that part.',
    'Left some comments on the PR.',
  ],
  design: [
    'Colors are 🔥',
    'Love the new direction.',
    'Can we try a slightly darker shade?',
    'Sharing for review in 5.',
  ],
};

export const EMOJIS = ['😊', '👋', '🔥', '👍', '❤️', '😂', '🚀', '✅', '💡', '🎉'];
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '🎉'];
