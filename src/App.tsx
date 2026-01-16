// Test change for GitHub push capability - added by AI assistant
import React, { useState, useEffect } from 'react';
import Card from './components/Card';
import PlayerArea from './components/PlayerArea';
import { Deck, createDeck } from './game/deck';
import { Card as CardType, Player, GameState, PokerHand } from './game/types';
import { getAIDecision, AIPersonality } from './game/ai';
import { evaluateHand, compareHands } from './game/pokerLogic';
import './App.css';

function App() {
  // Game initialization state
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [humanPlayerName, setHumanPlayerName] = useState<string>('Player1');
  const [humanIsDealerFirst, setHumanIsDealerFirst] = useState<boolean>(false);

  // Round-based game state
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [overallWinner, setOverallWinner] = useState<Player | null>(null);

  // Initialize players with starting chips ($100 each)
  const getInitialPlayers = (humanName: string, humanDealer: boolean) => [
    {
      id: 'human',
      name: humanName,
      cards: [],
      chips: 100,
      isHuman: true,
      isDealer: humanDealer,
      isSmallBlind: !humanDealer,
      isBigBlind: humanDealer,
      currentBet: 0,
      hasFolded: false,
    },
    {
      id: 'ai',
      name: 'AI Player',
      cards: [],
      chips: 100,
      isHuman: false,
      isDealer: !humanDealer,
      isSmallBlind: humanDealer,
      isBigBlind: !humanDealer,
      currentBet: 0,
      hasFolded: false,
    },
  ];

  const [players, setPlayers] = useState<Player[]>(getInitialPlayers('Player1', false));
  const [deck, setDeck] = useState<Deck>(createDeck());
  const [communityCards, setCommunityCards] = useState<CardType[]>([]);
  const [burnedCards, setBurnedCards] = useState<CardType[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [raiseAmount, setRaiseAmount] = useState<string>('');
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>('balanced');
  const [winner, setWinner] = useState<Player | null>(null);
  const [handComplete, setHandComplete] = useState<boolean>(false);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [animatingCardIndices, setAnimatingCardIndices] = useState<number[]>([]);
  const [burnAnimatingIndex, setBurnAnimatingIndex] = useState<number | null>(null);
  const [holeCardAnimating, setHoleCardAnimating] = useState<boolean>(false);
  const [aiActionDisplay, setAiActionDisplay] = useState<{action: string, amount?: number, isThinking: boolean} | null>(null);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState<string | null>(null);

  // Start the game with initialization parameters
  const startGame = () => {
    const initialPlayers = getInitialPlayers(humanPlayerName, humanIsDealerFirst);
    setPlayers(initialPlayers);
    setGameStarted(true);
    setRoundNumber(1);
    setGameOver(false);
    setOverallWinner(null);
    // Trigger the first hand deal
    setTimeout(() => {
      dealNewHand();
    }, 100);
  };

  // Reset game to initial state
  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setOverallWinner(null);
    setRoundNumber(1);
    setGamePhase('waiting');
    setWinner(null);
    setHandComplete(false);
    setCommunityCards([]);
    setBurnedCards([]);
    setPot(0);
    setCurrentBet(0);
    setCurrentPlayerIndex(0);
    setPlayers(getInitialPlayers('Player1', false));
    setDeck(createDeck());
  };

  const determineWinner = () => {
    const activePlayers = players.filter(p => !p.hasFolded);

    if (activePlayers.length === 1) {
      // Only one player left, they win by default
      const winningPlayer = activePlayers[0];
      setPlayers(prevPlayers =>
        prevPlayers.map(player =>
          player.id === winningPlayer.id
            ? { ...player, chips: player.chips + pot }
            : player
        )
      );
      setWinner(winningPlayer);
      setHandComplete(true);
      return;
    }

    // Multiple players still active, evaluate hands
    const playerHands: { player: Player; hand: PokerHand }[] = activePlayers.map(player => ({
      player,
      hand: evaluateHand(player.cards, communityCards)
    }));

    // Find the best hand
    let bestHandIndex = 0;
    for (let i = 1; i < playerHands.length; i++) {
      const comparison = compareHands(playerHands[i].hand, playerHands[bestHandIndex].hand);
      if (comparison > 0) {
        bestHandIndex = i;
      }
    }

    const winningPlayer = playerHands[bestHandIndex].player;

    // Award the pot to the winner
    const updatedPlayers = players.map(player =>
      player.id === winningPlayer.id
        ? { ...player, chips: player.chips + pot }
        : player
    );

    setPlayers(updatedPlayers);
    setWinner(winningPlayer);
    setHandComplete(true);

    // Check for bust condition (player with $0 chips)
    const bustedPlayers = updatedPlayers.filter(p => p.chips <= 0);
    if (bustedPlayers.length > 0) {
      // Game over - one player has gone bust
      const remainingPlayers = updatedPlayers.filter(p => p.chips > 0);
      const gameWinner = remainingPlayers[0]; // Should only be one remaining player
      setOverallWinner(gameWinner);
      setGameOver(true);
    }
  };

  const dealNewHand = () => {
    const newDeck = createDeck();

    // Deal hole cards to players
    const humanPlayer = players.find(p => p.isHuman)!;
    const aiPlayer = players.find(p => !p.isHuman)!;

    const humanHand = newDeck.dealCards(2);
    const aiHand = newDeck.dealCards(2);

    // Reset player states for new hand
    const resetPlayers = players.map(player => ({
      ...player,
      cards: [], // Start with no cards visible
      currentBet: 0,
      hasFolded: false,
    }));

    // Post blinds ($5 small blind, $10 big blind)
    const SMALL_BLIND = 5;
    const BIG_BLIND = 10;

    const playersWithBlinds = resetPlayers.map(player => {
      if (player.isSmallBlind) {
        return { ...player, chips: Math.max(0, player.chips - SMALL_BLIND), currentBet: SMALL_BLIND };
      } else if (player.isBigBlind) {
        return { ...player, chips: Math.max(0, player.chips - BIG_BLIND), currentBet: BIG_BLIND };
      }
      return player;
    });

    setDeck(newDeck);
    setPlayers(playersWithBlinds);
    setCommunityCards([]); // Start with no community cards visible
    setBurnedCards([]); // Reset burned cards for new hand
    setPot(SMALL_BLIND + BIG_BLIND);
    setCurrentBet(BIG_BLIND);
    setCurrentPlayerIndex(0); // Start with human player (after blinds)
    setGamePhase('preflop');
    setRaiseAmount('');
    setWinner(null);
    setHandComplete(false);

    // Animate hole card dealing
    setHoleCardAnimating(true);
    setTimeout(() => {
      // Deal first card to each player
      setPlayers(prevPlayers =>
        prevPlayers.map(player => ({
          ...player,
          cards: player.isHuman ? [humanHand[0]] : [aiHand[0]]
        }))
      );

      setTimeout(() => {
        // Deal second card to each player
        setPlayers(prevPlayers =>
          prevPlayers.map(player => ({
            ...player,
            cards: player.isHuman ? humanHand : aiHand
          }))
        );

        setTimeout(() => {
          setHoleCardAnimating(false);
        }, 600); // Animation duration
      }, 400); // Delay between first and second card
    }, 200); // Initial delay
  };

  // Start next round with dealer rotation
  const startNextRound = () => {
    // Rotate dealer/button positions
    const nextRoundPlayers = players.map(player => ({
      ...player,
      isDealer: !player.isDealer,
      isSmallBlind: !player.isSmallBlind,
      isBigBlind: !player.isBigBlind,
    }));

    setPlayers(nextRoundPlayers);
    setRoundNumber(roundNumber + 1);
    setWinner(null);
    setHandComplete(false);

    // Start new hand after a brief delay
    setTimeout(() => {
      dealNewHand();
    }, 500);
  };

  // Function to transition to the next game phase
  const advanceGamePhase = () => {
    const activePlayers = players.filter(p => !p.hasFolded);

    if (activePlayers.length <= 1) {
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      return;
    }

    setIsDealing(true);

    let newCommunityCards = [...communityCards];
    let newBurnedCards = [...burnedCards];
    let cardsToDeal: CardType[] = [];
    let newPhase: typeof gamePhase;

    switch (gamePhase) {
      case 'preflop':
        // Burn 1 card, then deal flop (3 community cards)
        setPhaseAnnouncement("Burning card and dealing the FLOP!");
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(3);
        newCommunityCards = cardsToDeal;
        newPhase = 'flop';
        break;
      case 'flop':
        // Burn 1 card, then deal turn (1 more community card)
        setPhaseAnnouncement("Burning card and dealing the TURN!");
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'turn';
        break;
      case 'turn':
        // Burn 1 card, then deal river (1 more community card)
        setPhaseAnnouncement("Burning card and dealing the RIVER!");
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'river';
        break;
      case 'river':
        // Move to showdown
        setPhaseAnnouncement("Showdown! Revealing all hands!");
        newPhase = 'showdown';
        setCurrentPlayerIndex(-1);
        // Determine winner after a short delay to allow UI to update
        setTimeout(() => {
          determineWinner();
          setIsDealing(false);
        }, 500);
        break;
      default:
        setIsDealing(false);
        return; // Don't advance from other phases
    }

    if (gamePhase !== 'river') {
      // First animate the burn card
      setBurnAnimatingIndex(burnedCards.length);

      setTimeout(() => {
        setBurnedCards(newBurnedCards);
        setBurnAnimatingIndex(null);

        // For flop, implement staggered card reveals
        if (gamePhase === 'preflop') {
          // Flop: Deal 3 cards with staggered timing
          const flopCards = cardsToDeal;
          let currentCardIndex = 0;

          const dealNextFlopCard = () => {
            if (currentCardIndex < flopCards.length) {
              // Add one card at a time
              const cardToAdd = flopCards[currentCardIndex];
              const cardIndex = communityCards.length + currentCardIndex;

              setCommunityCards(prev => [...prev, cardToAdd]);
              setAnimatingCardIndices([cardIndex]);

              currentCardIndex++;

              // Schedule next card after animation delay
              setTimeout(() => {
                setAnimatingCardIndices([]); // Clear animation for previous card
                dealNextFlopCard(); // Deal next card
              }, 600); // 600ms delay between each flop card
            } else {
              // All flop cards dealt, complete the phase transition
              setTimeout(() => {
                setGamePhase(newPhase);
                setDeck(deck);
                setIsDealing(false);

                // Reset current bets for new betting round
                const resetBetPlayers = players.map(player => ({
                  ...player,
                  currentBet: 0,
                }));
                setPlayers(resetBetPlayers);
                setCurrentBet(0);

                // Find first active player for new betting round
                const firstActivePlayerIndex = resetBetPlayers.findIndex(p => !p.hasFolded);
                setCurrentPlayerIndex(firstActivePlayerIndex);

                // Clear phase announcement after animation
                setTimeout(() => {
                  setPhaseAnnouncement(null);
                }, 2500);
              }, 400); // Brief pause after last card
            }
          };

          // Start dealing the first flop card
          setTimeout(dealNextFlopCard, 300);
        } else {
          // Turn/River: Deal single card with animation
          setCommunityCards(newCommunityCards);
          const startIndex = communityCards.length;
          setAnimatingCardIndices([startIndex]);

          // Complete the phase transition after animation
          setTimeout(() => {
            setGamePhase(newPhase);
            setDeck(deck);
            setAnimatingCardIndices([]);
            setIsDealing(false);

            // Reset current bets for new betting round
            const resetBetPlayers = players.map(player => ({
              ...player,
              currentBet: 0,
            }));
            setPlayers(resetBetPlayers);
            setCurrentBet(0);

            // Find first active player for new betting round
            const firstActivePlayerIndex = resetBetPlayers.findIndex(p => !p.hasFolded);
            setCurrentPlayerIndex(firstActivePlayerIndex);

            // Clear phase announcement after animation
            setTimeout(() => {
              setPhaseAnnouncement(null);
            }, 2500);
          }, 1200); // Wait for single card dealing animation
        }
      }, 1000); // Wait for burn animation
    }
  };

  useEffect(() => {
    if (gameStarted && !gameOver) {
      dealNewHand();
    }
  }, [gameStarted, roundNumber]);

  // Function to check if betting round is complete
  const isBettingRoundComplete = (players: Player[], currentBet: number): boolean => {
    const activePlayers = players.filter(p => !p.hasFolded);
    if (activePlayers.length <= 1) return true;

    // All active players must have acted (currentBet matches their currentBet or they've folded)
    return activePlayers.every(player => player.currentBet === currentBet);
  };

  // Function to get next active player index
  const getNextActivePlayerIndex = (players: Player[], currentIndex: number): number => {
    const activePlayers = players.filter(p => !p.hasFolded);
    if (activePlayers.length <= 1) return -1;

    const currentPlayer = players[currentIndex];
    const currentActiveIndex = activePlayers.findIndex(p => p.id === currentPlayer.id);
    const nextActiveIndex = (currentActiveIndex + 1) % activePlayers.length;
    const nextPlayerId = activePlayers[nextActiveIndex].id;
    return players.findIndex(p => p.id === nextPlayerId);
  };

  const handleBettingAction = (action: 'fold' | 'call' | 'raise') => {
    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer || !currentPlayer.isHuman) return;

    let newPlayers = [...players];
    let newPot = pot;
    let newCurrentBet = currentBet;

    switch (action) {
      case 'fold':
        newPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          hasFolded: true,
        };
        break;

      case 'call':
        const callAmount = Math.max(0, currentBet - currentPlayer.currentBet);
        if (currentPlayer.chips >= callAmount) {
          newPlayers[currentPlayerIndex] = {
            ...currentPlayer,
            chips: currentPlayer.chips - callAmount,
            currentBet: currentPlayer.currentBet + callAmount,
          };
          newPot += callAmount;
        }
        break;

      case 'raise':
        const raiseValue = parseInt(raiseAmount);
        if (isNaN(raiseValue) || raiseValue <= 0) return;

        const totalRaiseAmount = currentBet - currentPlayer.currentBet + raiseValue;
        if (currentPlayer.chips >= totalRaiseAmount) {
          newPlayers[currentPlayerIndex] = {
            ...currentPlayer,
            chips: currentPlayer.chips - totalRaiseAmount,
            currentBet: currentPlayer.currentBet + totalRaiseAmount,
          };
          newPot += totalRaiseAmount;
          newCurrentBet = currentPlayer.currentBet + totalRaiseAmount;
          setRaiseAmount(''); // Clear the input
        }
        break;
    }

    setPlayers(newPlayers);
    setPot(newPot);
    setCurrentBet(newCurrentBet);

    // Check if betting round is complete
    const bettingRoundComplete = isBettingRoundComplete(newPlayers, newCurrentBet);
    const activePlayers = newPlayers.filter(p => !p.hasFolded);

    if (activePlayers.length <= 1) {
      // Game should end if only one player remains
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      setTimeout(() => {
        determineWinner();
      }, 500);
      return;
    }

    if (bettingRoundComplete) {
      // Advance to next phase
      setTimeout(() => {
        advanceGamePhase();
      }, 1000);
      return;
    }

    // Continue betting round - move to next player
    const nextPlayerIndex = getNextActivePlayerIndex(newPlayers, currentPlayerIndex);
    setCurrentPlayerIndex(nextPlayerIndex);

    // If next player is AI, let AI make decision
    if (nextPlayerIndex !== -1 && !newPlayers[nextPlayerIndex].isHuman && !newPlayers[nextPlayerIndex].hasFolded) {
      // Show AI thinking animation
      setAiActionDisplay({ action: '', isThinking: true });

      setTimeout(() => {
        // AI makes strategic decision
        const aiPlayer = newPlayers[nextPlayerIndex];
        const activePlayersCount = newPlayers.filter(p => !p.hasFolded).length;

        const aiDecision = getAIDecision(
          aiPlayer,
          communityCards,
          newCurrentBet,
          newPot,
          gamePhase,
          activePlayersCount,
          aiPersonality
        );

        let aiBetAmount = 0;
        let updatedPlayers = [...newPlayers];
        let updatedPot = newPot;
        let updatedCurrentBet = newCurrentBet;

        switch (aiDecision.action) {
          case 'fold':
            updatedPlayers[nextPlayerIndex] = {
              ...aiPlayer,
              hasFolded: true,
            };
            setAiActionDisplay({ action: 'folds', isThinking: false });
            break;

          case 'call':
            aiBetAmount = Math.max(0, updatedCurrentBet - aiPlayer.currentBet);
            if (aiPlayer.chips >= aiBetAmount) {
              updatedPlayers[nextPlayerIndex] = {
                ...aiPlayer,
                chips: aiPlayer.chips - aiBetAmount,
                currentBet: aiPlayer.currentBet + aiBetAmount,
              };
              updatedPot += aiBetAmount;
              setAiActionDisplay({ action: 'calls', amount: aiBetAmount, isThinking: false });
            }
            break;

          case 'raise':
            const raiseAmount = aiDecision.amount || 0;
            const totalRaiseAmount = updatedCurrentBet - aiPlayer.currentBet + raiseAmount;
            if (aiPlayer.chips >= totalRaiseAmount) {
              updatedPlayers[nextPlayerIndex] = {
                ...aiPlayer,
                chips: aiPlayer.chips - totalRaiseAmount,
                currentBet: aiPlayer.currentBet + totalRaiseAmount,
              };
              updatedPot += totalRaiseAmount;
              updatedCurrentBet = aiPlayer.currentBet + totalRaiseAmount;
              setAiActionDisplay({ action: 'raises', amount: totalRaiseAmount, isThinking: false });
            } else {
              // If can't raise the full amount, just call
              aiBetAmount = Math.max(0, updatedCurrentBet - aiPlayer.currentBet);
              if (aiPlayer.chips >= aiBetAmount) {
                updatedPlayers[nextPlayerIndex] = {
                  ...aiPlayer,
                  chips: aiPlayer.chips - aiBetAmount,
                  currentBet: aiPlayer.currentBet + aiBetAmount,
                };
                updatedPot += aiBetAmount;
                setAiActionDisplay({ action: 'calls', amount: aiBetAmount, isThinking: false });
              }
            }
            break;
        }

        setPot(updatedPot);
        setCurrentBet(updatedCurrentBet);
        setPlayers(updatedPlayers);

        // Clear AI action display after a delay
        setTimeout(() => {
          setAiActionDisplay(null);
        }, 2500);

        // Check again if betting round is now complete after AI action
        const aiBettingRoundComplete = isBettingRoundComplete(updatedPlayers, updatedCurrentBet);
        const aiActivePlayers = updatedPlayers.filter(p => !p.hasFolded);

        if (aiActivePlayers.length <= 1) {
          setGamePhase('showdown');
          setCurrentPlayerIndex(-1);
          setTimeout(() => {
            determineWinner();
          }, 500);
        } else if (aiBettingRoundComplete) {
          // Advance to next phase
          setTimeout(() => {
            advanceGamePhase();
          }, 1000);
        } else {
          // Continue to next player
          const nextAiPlayerIndex = getNextActivePlayerIndex(updatedPlayers, nextPlayerIndex);
          setCurrentPlayerIndex(nextAiPlayerIndex);
        }
      }, 1500); // Longer delay for AI decision
    }
  };

  // Show initialization screen if game hasn't started
  if (!gameStarted) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Texas Hold'em Poker</h1>
          <p>A React + TypeScript Poker Game</p>
        </header>

        <main className="game-container">
          <div className="game-init-screen">
            <h2>Welcome to Texas Hold'em!</h2>
            <div className="init-form">
              <div className="form-group">
                <label htmlFor="player-name">Your Name:</label>
                <input
                  id="player-name"
                  type="text"
                  value={humanPlayerName}
                  onChange={(e) => setHumanPlayerName(e.target.value || 'Player1')}
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label>Who deals first?</label>
                <div className="dealer-choice">
                  <label>
                    <input
                      type="radio"
                      name="dealer"
                      checked={humanIsDealerFirst}
                      onChange={() => setHumanIsDealerFirst(true)}
                    />
                    You deal first (Small Blind)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="dealer"
                      checked={!humanIsDealerFirst}
                      onChange={() => setHumanIsDealerFirst(false)}
                    />
                    AI deals first (Small Blind)
                  </label>
                </div>
              </div>

              <div className="game-rules">
                <h3>Game Rules:</h3>
                <ul>
                  <li>Each player starts with $100</li>
                  <li>Small Blind: $5, Big Blind: $10</li>
                  <li>Play continues until one player loses all chips</li>
                  <li>Dealer position alternates each round</li>
                </ul>
              </div>

              <button
                className="start-game-button"
                onClick={startGame}
                disabled={!humanPlayerName.trim()}
              >
                Start Game
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show victory/defeat screen if game is over
  if (gameOver && overallWinner) {
    const isHumanWinner = overallWinner.isHuman;
    return (
      <div className="App">
        <header className="App-header">
          <h1>Texas Hold'em Poker</h1>
          <p>A React + TypeScript Poker Game</p>
        </header>

        <main className="game-container">
          <div className={`game-over-screen ${isHumanWinner ? 'victory' : 'defeat'}`}>
            <h2>{isHumanWinner ? '🎉 Victory! 🎉' : '💔 Defeat 💔'}</h2>
            <p className="winner-message">
              {isHumanWinner
                ? `Congratulations ${overallWinner.name}! You won all the chips!`
                : `${overallWinner.name} won all the chips. Better luck next time!`
              }
            </p>
            <div className="final-scores">
              <h3>Final Scores:</h3>
              {players.map(player => (
                <p key={player.id}>
                  {player.name}: ${player.chips}
                </p>
              ))}
            </div>
            <button className="start-over-button" onClick={resetGame}>
              Start Over
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Texas Hold'em Poker</h1>
        <p>A React + TypeScript Poker Game</p>
        <div className="game-info-bar">
          <span>Round {roundNumber}</span>
          <span>{humanPlayerName} vs AI Player</span>
        </div>
      </header>

      <main className="game-container">
        {/* Burned Cards */}
        <div className="burned-cards">
          <h3>Burn Cards</h3>
          <div className="cards-row">
            {burnedCards.map((card, index) => (
              <Card
                key={`burned-${index}`}
                card={card}
                isBurned={true}
                isBurnAnimating={burnAnimatingIndex === index}
              />
            ))}
            {/* Show placeholder for upcoming burn cards */}
            {gamePhase === 'preflop' && <Card card={null} isBurned={true} />}
            {(gamePhase === 'flop' || gamePhase === 'turn') && (
              <>
                <Card card={null} isBurned={true} />
                <Card card={null} isBurned={true} />
              </>
            )}
            {gamePhase === 'turn' && <Card card={null} isBurned={true} />}
          </div>
        </div>

        {/* Phase Indicator */}
        <div className={`phase-indicator phase-${gamePhase.toLowerCase()}`}>
          <div className="phase-name">
            {gamePhase === 'waiting' && 'Waiting to Start'}
            {gamePhase === 'preflop' && 'Preflop'}
            {gamePhase === 'flop' && 'Flop'}
            {gamePhase === 'turn' && 'Turn'}
            {gamePhase === 'river' && 'River'}
            {gamePhase === 'showdown' && 'Showdown'}
          </div>
          <div className="phase-description">
            {gamePhase === 'preflop' && 'Betting round - Hole cards dealt'}
            {gamePhase === 'flop' && '3 community cards revealed'}
            {gamePhase === 'turn' && '4th community card revealed'}
            {gamePhase === 'river' && '5th community card revealed'}
            {gamePhase === 'showdown' && 'Hands revealed - Determining winner'}
          </div>
        </div>

        {/* Phase Announcement */}
        {phaseAnnouncement && (
          <div className="phase-announcement">
            <div className="announcement-content">
              <div className="announcement-icon">🎯</div>
              <div className="announcement-text">{phaseAnnouncement}</div>
            </div>
          </div>
        )}

        {/* Community Cards */}
        <div className="community-cards">
          <h3>Community Cards</h3>
          <div className="cards-row">
            {communityCards.map((card, index) => {
              // Only show cards that should be visible in current phase
              const shouldShowCard = (
                (gamePhase === 'flop' && index < 3) ||
                (gamePhase === 'turn' && index < 4) ||
                (gamePhase === 'river' && index < 5) ||
                gamePhase === 'showdown'
              );

              return (
                <Card
                  key={`community-${index}`}
                  card={shouldShowCard ? card : null}
                  isDealing={animatingCardIndices.includes(index)}
                />
              );
            })}
            {/* Show placeholder cards for unrevealed cards */}
            {gamePhase === 'preflop' && (
              <>
                <Card card={null} />
                <Card card={null} />
                <Card card={null} />
              </>
            )}
            {gamePhase === 'flop' && (
              <>
                <Card card={null} />
                <Card card={null} />
              </>
            )}
            {gamePhase === 'turn' && (
              <Card card={null} />
            )}
          </div>
        </div>

        {/* Player Areas */}
        <div className="players-section">
          {players.map((player, index) => (
            <PlayerArea
              key={player.id}
              player={player}
              isCurrentPlayer={index === currentPlayerIndex}
              gamePhase={gamePhase}
              holeCardAnimating={holeCardAnimating}
            />
          ))}
        </div>

        {/* AI Action Display */}
        {aiActionDisplay && (
          <div className="ai-action-display">
            <div className="ai-action-content">
              <div className="ai-avatar">🤖</div>
              <div className="ai-action-text">
                {aiActionDisplay.isThinking ? (
                  <>
                    <div className="thinking-text">AI is thinking...</div>
                    <div className="thinking-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </>
                ) : (
                  <div className="action-text">
                    AI {aiActionDisplay.action}
                    {aiActionDisplay.amount && aiActionDisplay.amount > 0 && (
                      <span className="action-amount"> ${aiActionDisplay.amount}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="game-controls">
          <div className="game-info">
            <p>Pot: ${pot}</p>
            <p>Current Bet: ${currentBet}</p>
            <p>Phase: {gamePhase}</p>
            <p>Current Player: {players[currentPlayerIndex]?.name || 'None'}</p>
            {winner && handComplete && (
              <div className="winner-announcement">
                <h3>🏆 {winner.name} Wins! 🏆</h3>
                <p>Pot awarded: ${pot}</p>
              </div>
            )}
            <div className="ai-settings">
              <label htmlFor="ai-personality">AI Personality: </label>
              <select
                id="ai-personality"
                value={aiPersonality}
                onChange={(e) => setAiPersonality(e.target.value as AIPersonality)}
                className="ai-personality-select"
              >
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>

          {/* Betting Controls - Only show when it's human player's turn */}
          {players[currentPlayerIndex]?.isHuman && gamePhase !== 'waiting' && (
            <div className="betting-controls">
              <button className="bet-button fold-button" onClick={() => handleBettingAction('fold')}>
                Fold
              </button>
              <button className="bet-button call-button" onClick={() => handleBettingAction('call')}>
                Call ${Math.max(0, currentBet - players[currentPlayerIndex].currentBet)}
              </button>
              <div className="raise-section">
                <input
                  type="number"
                  placeholder="Raise amount"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  className="raise-input"
                  min={currentBet - players[currentPlayerIndex].currentBet + 1}
                />
                <button className="bet-button raise-button" onClick={() => handleBettingAction('raise')}>
                  Raise
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handComplete && !gameOver ? startNextRound : dealNewHand}
            className="deal-button"
            disabled={(!handComplete && gamePhase !== 'waiting') || gameOver}
          >
            {handComplete && !gameOver ? 'Next Round' : handComplete ? 'Deal New Hand' : 'Hand in Progress'}
          </button>
          <p>Cards remaining in deck: {deck.getRemainingCards()}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
