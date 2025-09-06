import React, { useState, useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Game constants
const GAME_SPEED = 2;
const ENEMY_SPAWN_RATE = 0.02;
const CHARACTER_SIZE = 40;
const ENEMY_SIZE = 30;

// Quiz questions
const QUIZ_QUESTIONS = [
  {
    question: '🧮 What is 7 × 8?',
    options: ['54', '56', '48', '64'],
    correct: 1,
  },
  {
    question: '🎨 What color do you get when you mix red and blue?',
    options: ['Green', 'Purple', 'Orange', 'Yellow'],
    correct: 1,
  },
  {
    question: '📅 How many days are in a week?',
    options: ['5', '6', '7', '8'],
    correct: 2,
  },
  {
    question: '🌍 What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correct: 2,
  },
  {
    question: '🐱 What animal says "meow"?',
    options: ['Dog', 'Cat', 'Bird', 'Fish'],
    correct: 1,
  },
  {
    question: '🌟 Which planet is closest to the Sun?',
    options: ['Venus', 'Mercury', 'Earth', 'Mars'],
    correct: 1,
  },
  {
    question: '📚 How many letters are in the English alphabet?',
    options: ['24', '25', '26', '27'],
    correct: 2,
  },
  {
    question:
      '🍎 What fruit is traditionally associated with keeping doctors away?',
    options: ['Orange', 'Banana', 'Apple', 'Grape'],
    correct: 2,
  },
  {
    question: '⚡ What is 15 + 27?',
    options: ['41', '42', '43', '44'],
    correct: 1,
  },
  {
    question: '🌊 What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correct: 3,
  },
];

// Game entities
const Character = props => {
  const { body } = props;
  const { position } = body;

  return (
    <View
      style={[
        styles.character,
        {
          left: position.x - CHARACTER_SIZE / 2,
          top: position.y - CHARACTER_SIZE / 2,
        },
      ]}
    >
      <Text style={styles.characterEmoji}>🦸‍♂️</Text>
    </View>
  );
};

const Enemy = props => {
  const { body } = props;
  const { position } = body;

  return (
    <View
      style={[
        styles.enemy,
        {
          left: position.x - ENEMY_SIZE / 2,
          top: position.y - ENEMY_SIZE / 2,
        },
      ]}
    >
      <Text style={styles.enemyIcon}>🧌</Text>
    </View>
  );
};

// Physics engine setup
const Physics = (entities, { time, input }) => {
  const engine = entities.physics.engine;
  const world = entities.physics.world;

  // Update physics
  Matter.Engine.update(engine, time.delta);

  // Move character forward automatically
  const character = entities.character.body;
  Matter.Body.setVelocity(character, { x: GAME_SPEED, y: 0 });

  // Spawn enemies randomly
  if (Math.random() < ENEMY_SPAWN_RATE) {
    const enemyId = `enemy-${Date.now()}`;
    const randomY = Math.random() * (screenHeight - 200) + 100; // Random Y position
    const enemy = Matter.Bodies.rectangle(
      character.position.x + 300, // Spawn ahead of character
      randomY,
      ENEMY_SIZE,
      ENEMY_SIZE,
      { isStatic: false },
    );
    Matter.World.add(world, enemy);
    entities[enemyId] = {
      body: enemy,
      renderer: Enemy,
    };
  }

  // Remove enemies that are off-screen
  Object.keys(entities).forEach(key => {
    if (
      key.startsWith('enemy-') &&
      entities[key].body.position.x < character.position.x - 100
    ) {
      Matter.World.remove(world, entities[key].body);
      delete entities[key];
    }
  });

  // For demo: spawn a single enemy directly in front of the character if not already present
  if (
    !entities.enemy &&
    Object.keys(entities).filter(key => key.startsWith('enemy-')).length === 0
  ) {
    const characterY = character.position.y;
    const enemy = Matter.Bodies.rectangle(
      character.position.x + 200, // 200px in front of character
      characterY,
      ENEMY_SIZE,
      ENEMY_SIZE,
      { isStatic: false },
    );
    Matter.World.add(world, enemy);
    entities.enemy = {
      body: enemy,
      renderer: Enemy,
    };
  }

  // Remove demo enemy if off screen
  if (
    entities.enemy &&
    entities.enemy.body.position.x < character.position.x - 100
  ) {
    Matter.World.remove(world, entities.enemy.body);
    delete entities.enemy;
  }

  return entities;
};

// Collision detection
const CollisionDetection = (entities, { events, dispatch }) => {
  const character = entities.character.body;

  Object.keys(entities).forEach(key => {
    if (key.startsWith('enemy-') || key === 'enemy') {
      const enemy = entities[key];
      const distance = Math.sqrt(
        Math.pow(character.position.x - enemy.body.position.x, 2) +
          Math.pow(character.position.y - enemy.body.position.y, 2),
      );

      if (distance < (CHARACTER_SIZE + ENEMY_SIZE) / 2) {
        dispatch({ type: 'collision', enemyKey: key });
      }
    }
  });

  return entities;
};

export default function App() {
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [currentCollidedEnemy, setCurrentCollidedEnemy] = useState(null);
  const gameEngineRef = useRef(null);

  // Persist engine, world, character, and entities across renders
  const engineRef = useRef();
  const worldRef = useRef();
  const characterRef = useRef();
  const entitiesRef = useRef();

  // Initialize only once
  if (!engineRef.current) {
    engineRef.current = Matter.Engine.create({ enableSleeping: false });
    worldRef.current = engineRef.current.world;
    // Disable vertical gravity
    worldRef.current.gravity.y = 0;
    characterRef.current = Matter.Bodies.rectangle(
      50,
      screenHeight / 2,
      CHARACTER_SIZE,
      CHARACTER_SIZE,
      { isStatic: false },
    );
    Matter.World.add(worldRef.current, characterRef.current);
    entitiesRef.current = {
      physics: { engine: engineRef.current, world: worldRef.current },
      character: { body: characterRef.current, renderer: Character },
    };
  }

  // Start game
  const startGame = () => {
    setGameRunning(true);
    setGameOver(false);
    setShowQuiz(false);
    setScore(0);
    setCurrentQuestion(0);
    setCurrentCollidedEnemy(null);

    // Reset character position
    Matter.Body.setPosition(characterRef.current, {
      x: 50,
      y: screenHeight / 2,
    });
    Matter.Body.setVelocity(characterRef.current, { x: 0, y: 0 });

    // Remove all enemies for a fresh start
    Object.keys(entitiesRef.current).forEach(key => {
      if (key.startsWith('enemy-') || key === 'enemy') {
        Matter.World.remove(worldRef.current, entitiesRef.current[key].body);
        delete entitiesRef.current[key];
      }
    });
  };

  // Handle collision
  const handleCollision = event => {
    if (event.type === 'collision') {
      setGameRunning(false);
      setShowQuiz(true);
      // Store the collided enemy key for later removal
      setCurrentCollidedEnemy(event.enemyKey);
    }
  };

  // Handle quiz answer
  const handleQuizAnswer = selectedOption => {
    const question = QUIZ_QUESTIONS[currentQuestion];

    if (selectedOption === question.correct) {
      setScore(score + 10);
      setShowQuiz(false);
      setGameRunning(true);
      setCurrentQuestion((currentQuestion + 1) % QUIZ_QUESTIONS.length);
      // Remove the collided enemy so the character can keep moving
      if (currentCollidedEnemy && entitiesRef.current[currentCollidedEnemy]) {
        Matter.World.remove(
          worldRef.current,
          entitiesRef.current[currentCollidedEnemy].body,
        );
        delete entitiesRef.current[currentCollidedEnemy];
      }
      setCurrentCollidedEnemy(null);
    } else {
      setShowQuiz(false);
      setGameOver(true);
      // Remove all enemies for a clean restart
      Object.keys(entitiesRef.current).forEach(key => {
        if (key.startsWith('enemy-') || key === 'enemy') {
          Matter.World.remove(worldRef.current, entitiesRef.current[key].body);
          delete entitiesRef.current[key];
        }
      });
      setCurrentCollidedEnemy(null);
    }
  };

  // Reset game
  const resetGame = () => {
    setGameRunning(false);
    setGameOver(false);
    setShowQuiz(false);
    setScore(0);
    setCurrentQuestion(0);
    setCurrentCollidedEnemy(null);

    // Remove all enemies for a clean restart
    Object.keys(entitiesRef.current).forEach(key => {
      if (key.startsWith('enemy-') || key === 'enemy') {
        Matter.World.remove(worldRef.current, entitiesRef.current[key].body);
        delete entitiesRef.current[key];
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />

      {/* Background with parallax effect */}
      <View style={styles.gameBackground}>
        <View style={styles.cloud} />
        <View style={[styles.cloud, styles.cloud2]} />
        <View style={[styles.cloud, styles.cloud3]} />
      </View>

      {/* Game UI */}
      <View style={styles.gameUI}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
        {!gameRunning && !gameOver && (
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>🎮START ADVENTURE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Game Engine */}
      {gameRunning && (
        <GameEngine
          ref={gameEngineRef}
          systems={[Physics, CollisionDetection]}
          entities={entitiesRef.current}
          onEvent={handleCollision}
          style={styles.gameContainer}
        />
      )}

      {/* Ground decoration */}
      <View style={styles.ground}>
        <Text style={styles.groundPattern}>🌱🌿🌱🌿🌱🌿🌱🌿🌱🌿🌱🌿🌱🌿🌱</Text>
      </View>

      {/* Quiz Modal */}
      <Modal
        visible={showQuiz}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuiz(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizContainer}>
            <Text style={styles.quizTitle}>Quiz Time!</Text>
            <Text style={styles.questionText}>
              {QUIZ_QUESTIONS[currentQuestion].question}
            </Text>

            {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleQuizAnswer(index)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Game Over Modal */}
      <Modal
        visible={gameOver}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGameOver(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverTitle}>💥 Game Over!</Text>
            <Text style={styles.finalScoreText}>🏆 Final Score: {score}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
              <Text style={styles.buttonText}>🔄 Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  gameBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, #87CEEB, #98D8E8)',
  },
  cloud: {
    position: 'absolute',
    width: 80,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    top: 100,
    left: 50,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cloud2: {
    width: 100,
    height: 50,
    top: 150,
    left: 200,
    animationDelay: '2s',
  },
  cloud3: {
    width: 120,
    height: 60,
    top: 80,
    left: 300,
    animationDelay: '4s',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#654321',
  },
  groundPattern: {
    fontSize: 16,
    color: '#228B22',
    textAlign: 'center',
  },
  gameUI: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scoreLabel: {
    color: '#1a237e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreText: {
    color: '#1a237e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FF4500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  character: {
    position: 'absolute',
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
    backgroundColor: '#FF6B35',
    borderRadius: CHARACTER_SIZE / 2,
    borderWidth: 3,
    borderColor: '#FF4500',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  characterEmoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: '#8B0000',
    borderRadius: ENEMY_SIZE / 2,
    borderWidth: 3,
    borderColor: '#654321',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  enemyIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    width: screenWidth * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  quizTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a237e',
  },
  questionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
    color: '#34495e',
    lineHeight: 24,
  },
  optionButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#45a049',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gameOverContainer: {
    backgroundColor: 'white',
    padding: 35,
    borderRadius: 20,
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  finalScoreText: {
    fontSize: 22,
    color: '#2c3e50',
    marginBottom: 25,
    fontWeight: 'bold',
  },
  restartButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#229954',
  },
});
