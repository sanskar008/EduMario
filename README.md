# EduMario - Educational Mario Game

A simple React Native game that combines platforming with educational quizzes. The character automatically moves forward, and when it collides with enemies, players must answer quiz questions to continue playing.

## Features

- 🎮 Side-scrolling Mario-style character that auto-moves forward
- 👾 Randomly spawning enemies (red circles)
- 🧠 Educational quiz popups when colliding with enemies
- 📊 Score system
- 🎯 Multiple choice questions covering various topics
- 💀 Game over screen for wrong answers

## Installation

Make sure you have Node.js and React Native development environment set up. Then run:

```bash
# Install dependencies
npm install

# For Android development, make sure you have Android Studio and an emulator running
# Then run:
npm run android
```

## How to Play

1. Tap "Start Game" to begin
2. Watch as your character automatically moves forward
3. When you collide with a red enemy, a quiz question will appear
4. Answer correctly to continue playing and earn points
5. Answer incorrectly to trigger Game Over
6. Try to get the highest score possible!

## Game Mechanics

- **Character**: Red circle that moves automatically from left to right
- **Enemies**: Red circles that spawn randomly on the right side of the screen
- **Collision**: When character touches an enemy, the game pauses and shows a quiz
- **Scoring**: +10 points for each correct answer
- **Quiz**: 5 different questions covering math, colors, geography, and general knowledge

## Technical Details

- Built with React Native and TypeScript
- Uses `react-native-game-engine` for game loop management
- Uses `matter-js` for physics simulation
- Simple collision detection system
- Modal-based UI for quizzes and game over screens

## Dependencies

- react-native-game-engine
- matter-js
- @types/matter-js (for TypeScript support)

Enjoy learning while playing! 🎓🎮
