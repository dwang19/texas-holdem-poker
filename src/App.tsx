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
  // Initialize players with starting chips
  const initialPlayers: Player[] = [
    {
      id: 'human',
      name: 'You',
      cards: [],
      chips: 1000,
      isHuman: true,
      isDealer: false,
      isSmallBlind: true,
      isBigBlind: false,
      currentBet: 0,
      hasFolded: false,
    },
    {
      id: 'ai',
      name: 'AI Player',
      cards: [],
      chips: 1000,
      isHuman: false,
      isDealer: true,
      isSmallBlind: false,
      isBigBlind: true,
      currentBet: 0,
      hasFolded: false,
    },
  ];

  const [deck, setDeck] = useState<Deck>(createDeck());
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
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
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === winningPlayer.id
          ? { ...player, chips: player.chips + pot }
          : player
      )
    );

    setWinner(winningPlayer);
    setHandComplete(true);
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

    // Post blinds
    const SMALL_BLIND = 5;
    const BIG_BLIND = 10;

    const playersWithBlinds = resetPlayers.map(player => {
      if (player.isSmallBlind) {
        return { ...player, chips: player.chips - SMALL_BLIND, currentBet: SMALL_BLIND };
      } else if (player.isBigBlind) {
        return { ...player, chips: player.chips - BIG_BLIND, currentBet: BIG_BLIND };
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
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(3);
        newCommunityCards = cardsToDeal;
        newPhase = 'flop';
        break;
      case 'flop':
        // Burn 1 card, then deal turn (1 more community card)
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'turn';
        break;
      case 'turn':
        // Burn 1 card, then deal river (1 more community card)
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'river';
        break;
      case 'river':
        // Move to showdown
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

        // Then set community cards and animate them
        setCommunityCards(newCommunityCards);

        // Animate the cards that were just dealt
        const startIndex = communityCards.length;
        const animatingIndices = cardsToDeal.map((_, index) => startIndex + index);
        setAnimatingCardIndices(animatingIndices);

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
        }, 1000); // Wait for card dealing animation
      }, 800); // Wait for burn animation
    }
  };

  useEffect(() => {
    dealNewHand();
  }, []);

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
              }
            }
            break;
        }

        setPot(updatedPot);
        setCurrentBet(updatedCurrentBet);
        setPlayers(updatedPlayers);

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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Texas Hold'em Poker</h1>
        <p>A React + TypeScript Poker Game</p>
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
            onClick={dealNewHand}
            className="deal-button"
            disabled={!handComplete && gamePhase !== 'waiting'}
          >
            {handComplete ? 'Deal New Hand' : 'Hand in Progress'}
          </button>
          <p>Cards remaining in deck: {deck.getRemainingCards()}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
