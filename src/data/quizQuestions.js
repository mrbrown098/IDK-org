// 10 original multiple-choice questions for discovering learning preferences.
// Simple English for ages 13+.
// Note: This questionnaire indicates everyday preferences and is not a clinical or scientific diagnosis.

export const PREFERENCES = ['visual', 'auditory', 'readingWriting', 'handsOn'];

export const quizQuestions = [
  {
    id: 1,
    question: 'When learning how to use a new phone or computer app, what helps you get comfortable fastest?',
    options: [
      { id: 'a', text: 'Watching a screen recording or diagram of the interface', preference: 'visual' },
      { id: 'b', text: 'Tapping around, trying buttons, and testing what happens directly', preference: 'handsOn' },
      { id: 'c', text: 'Reading step-by-step instructions or online documentation', preference: 'readingWriting' },
      { id: 'd', text: 'Listening to someone explain how the main features work', preference: 'auditory' }
    ]
  },
  {
    id: 2,
    question: 'If you need directions to a new place in town, how do you prefer to receive them?',
    options: [
      { id: 'a', text: 'Having someone explain the route to you out loud', preference: 'auditory' },
      { id: 'b', text: 'Looking at a map or satellite image with clear landmarks', preference: 'visual' },
      { id: 'c', text: 'Practicing by walking or driving the route once yourself', preference: 'handsOn' },
      { id: 'd', text: 'Reading a written list of street names and turns', preference: 'readingWriting' }
    ]
  },
  {
    id: 3,
    question: 'When preparing for a school or work presentation, what is your favorite way to practice?',
    options: [
      { id: 'a', text: 'Writing out detailed speaking notes or an organized outline', preference: 'readingWriting' },
      { id: 'b', text: 'Rehearsing physically with presentation props, slides, or movement', preference: 'handsOn' },
      { id: 'c', text: 'Talking through your points aloud to hear how your voice sounds', preference: 'auditory' },
      { id: 'd', text: 'Creating colorful slides, charts, and visual summaries', preference: 'visual' }
    ]
  },
  {
    id: 4,
    question: 'How do you prefer to assemble a piece of furniture or build a model kit?',
    options: [
      { id: 'a', text: 'Jumping straight into building and figuring it out by feel', preference: 'handsOn' },
      { id: 'b', text: 'Carefully reading the printed manual and parts list first', preference: 'readingWriting' },
      { id: 'c', text: 'Studying the assembly diagrams and illustrations', preference: 'visual' },
      { id: 'd', text: 'Having someone talk you through each step as you build', preference: 'auditory' }
    ]
  },
  {
    id: 5,
    question: 'When studying a history topic or story, what helps you remember key events best?',
    options: [
      { id: 'a', text: 'Reviewing an illustrated timeline or color-coded event chart', preference: 'visual' },
      { id: 'b', text: 'Listening to an audio documentary, lecture, or podcast', preference: 'auditory' },
      { id: 'c', text: 'Visiting a museum, handling objects, or re-enacting scenes', preference: 'handsOn' },
      { id: 'd', text: 'Writing summaries and vocabulary lists in your notebook', preference: 'readingWriting' }
    ]
  },
  {
    id: 6,
    question: 'If you want to learn how to cook a new recipe, what approach feels most natural?',
    options: [
      { id: 'a', text: 'Having a friend talk you through each step while you cook', preference: 'auditory' },
      { id: 'b', text: 'Reading through a cookbook or printed recipe with measurements', preference: 'readingWriting' },
      { id: 'c', text: 'Watching a cooking demonstration video showing the technique', preference: 'visual' },
      { id: 'd', text: 'Getting into the kitchen immediately and adjusting ingredients by taste and feel', preference: 'handsOn' }
    ]
  },
  {
    id: 7,
    question: 'When you encounter a problem or error in a project, how do you usually troubleshoot?',
    options: [
      { id: 'a', text: 'Changing parts of the setup hands-on to see what fixes it', preference: 'handsOn' },
      { id: 'b', text: 'Drawing a diagram of the system to spot where the break is', preference: 'visual' },
      { id: 'c', text: 'Reading error logs, guides, and written references', preference: 'readingWriting' },
      { id: 'd', text: 'Explaining the issue out loud to a friend or colleague', preference: 'auditory' }
    ]
  },
  {
    id: 8,
    question: 'When trying to understand a complex scientific concept, what makes it click?',
    options: [
      { id: 'a', text: 'Reading an article or chapter that defines terms precisely', preference: 'readingWriting' },
      { id: 'b', text: 'Looking at infographics, animations, or 3D models', preference: 'visual' },
      { id: 'c', text: 'Listening to a teacher explain the concept with spoken analogies', preference: 'auditory' },
      { id: 'd', text: 'Conducting an experiment or testing an interactive simulation', preference: 'handsOn' }
    ]
  },
  {
    id: 9,
    question: 'When planning a day trip with friends, what role do you enjoy most?',
    options: [
      { id: 'a', text: 'Calling everyone to talk through ideas and discuss what sounds fun', preference: 'auditory' },
      { id: 'b', text: 'Scouting out the location or walking the route ahead of time', preference: 'handsOn' },
      { id: 'c', text: 'Browsing photos and visual maps of interesting spots', preference: 'visual' },
      { id: 'd', text: 'Researching written reviews and writing down a schedule', preference: 'readingWriting' }
    ]
  },
  {
    id: 10,
    question: 'In a group assignment, which task would you naturally choose first?',
    options: [
      { id: 'a', text: 'Building the physical prototype or interactive demonstration', preference: 'handsOn' },
      { id: 'b', text: 'Delivering the spoken presentation and answering questions', preference: 'auditory' },
      { id: 'c', text: 'Writing and editing the project document and citations', preference: 'readingWriting' },
      { id: 'd', text: 'Designing the layout, graphics, and visual slides', preference: 'visual' }
    ]
  }
];
