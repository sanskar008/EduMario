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
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct: 1,
  },
  {
    question: 'What color do you get when you mix red and blue?',
    options: ['Green', 'Purple', 'Orange', 'Yellow'],
    correct: 1,
  },
  {
    question: 'How many days are in a week?',
    options: ['5', '6', '7', '8'],
    correct: 2,
  },
  {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correct: 2,
  },
  {
    question: "What animal says 'meow'?",
    options: ['Dog', 'Cat', 'Bird', 'Fish'],
    correct: 1,
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
    />
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
      <Text style={styles.enemyIcon}>💀</Text>
    </View>
  );
};

// Physics engine setup
const Physics = (entities, { time, input }) => {
  const engine = entities.physics.engine;
  const world = entities.physics.world;

  // Update physics
  Matter.Engine.update(engine, time.delta);

  // Move character forward automatically (no user control)
  const character = entities.character.body;
  Matter.Body.setVelocity(character, { x: GAME_SPEED, y: 0 });

  // For demo: spawn a single enemy directly in front of the character if not already present
  if (!entities.enemy) {
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

  // Remove enemy if off screen (optional, for cleanup)
  if (entities.enemy && entities.enemy.body.position.x < -ENEMY_SIZE) {
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

    // Reset character position
    Matter.Body.setPosition(characterRef.current, {
      x: 50,
      y: screenHeight / 2,
    });
    Matter.Body.setVelocity(characterRef.current, { x: 0, y: 0 });

    // Remove the demo enemy if present
    if (entitiesRef.current.enemy) {
      Matter.World.remove(worldRef.current, entitiesRef.current.enemy.body);
      delete entitiesRef.current.enemy;
    }
  };

  // Handle collision
  const handleCollision = event => {
    if (event.type === 'collision') {
      setGameRunning(false);
      setShowQuiz(true);
      // Do NOT remove the enemy yet; wait for quiz answer
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
      // Remove the enemy so the ball can keep moving
      if (entitiesRef.current.enemy) {
        Matter.World.remove(worldRef.current, entitiesRef.current.enemy.body);
        delete entitiesRef.current.enemy;
      }
    } else {
      setShowQuiz(false);
      setGameOver(true);
      // Remove the enemy for a clean restart
      if (entitiesRef.current.enemy) {
        Matter.World.remove(worldRef.current, entitiesRef.current.enemy.body);
        delete entitiesRef.current.enemy;
      }
    }
  };

  // Reset game
  const resetGame = () => {
    setGameRunning(false);
    setGameOver(false);
    setShowQuiz(false);
    setScore(0);
    setCurrentQuestion(0);

    // Remove the demo enemy if present
    if (entitiesRef.current.enemy) {
      Matter.World.remove(worldRef.current, entitiesRef.current.enemy.body);
      delete entitiesRef.current.enemy;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c3e50" />

      {/* Game UI */}
      <View style={styles.gameUI}>
        <Text style={styles.scoreText}>Score: {score}</Text>
        {!gameRunning && !gameOver && (
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>Start Game</Text>
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

      {/* Quiz Modal */}
      <Modal
        visible={showQuiz}
        transparent={true}
        animationType="fade"
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
            <Text style={styles.gameOverTitle}>Game Over!</Text>
            <Text style={styles.finalScoreText}>Final Score: {score}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
              <Text style={styles.buttonText}>Play Again</Text>
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
    backgroundColor: '#2c3e50',
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
  scoreText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue background
  },
  character: {
    position: 'absolute',
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
    backgroundColor: '#e74c3c',
    borderRadius: CHARACTER_SIZE / 2,
    borderWidth: 2,
    borderColor: '#c0392b',
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: '#fff',
    borderRadius: ENEMY_SIZE / 2,
    borderWidth: 3,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  enemyIcon: {
    fontSize: 22,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    flexDirection: 'column',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    backgroundColor: '#34495e',
    padding: 18,
    borderRadius: 30,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: screenWidth * 0.8,
    maxWidth: 400,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  questionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#34495e',
  },
  optionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    marginVertical: 5,
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gameOverContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    width: screenWidth * 0.8,
    maxWidth: 400,
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 20,
  },
  finalScoreText: {
    fontSize: 20,
    color: '#2c3e50',
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
  },
});
