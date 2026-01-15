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
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [raiseAmount, setRaiseAmount] = useState<string>('');
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>('balanced');
  const [winner, setWinner] = useState<Player | null>(null);
  const [handComplete, setHandComplete] = useState<boolean>(false);

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
      cards: player.isHuman ? humanHand : aiHand,
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
    setPot(SMALL_BLIND + BIG_BLIND);
    setCurrentBet(BIG_BLIND);
    setCurrentPlayerIndex(0); // Start with human player (after blinds)
    setGamePhase('preflop');
    setRaiseAmount('');
    setWinner(null);
    setHandComplete(false);
  };

  // Function to transition to the next game phase
  const advanceGamePhase = () => {
    const activePlayers = players.filter(p => !p.hasFolded);

    if (activePlayers.length <= 1) {
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      return;
    }

    let newCommunityCards = [...communityCards];
    let newPhase: typeof gamePhase;

    switch (gamePhase) {
      case 'preflop':
        // Deal flop (3 community cards)
        newCommunityCards = deck.dealCards(3);
        newPhase = 'flop';
        break;
      case 'flop':
        // Deal turn (1 more community card)
        newCommunityCards = [...communityCards, ...deck.dealCards(1)];
        newPhase = 'turn';
        break;
      case 'turn':
        // Deal river (1 more community card)
        newCommunityCards = [...communityCards, ...deck.dealCards(1)];
        newPhase = 'river';
        break;
      case 'river':
        // Move to showdown
        newPhase = 'showdown';
        setCurrentPlayerIndex(-1);
        // Determine winner after a short delay to allow UI to update
        setTimeout(() => {
          determineWinner();
        }, 500);
        break;
      default:
        return; // Don't advance from other phases
    }

    setCommunityCards(newCommunityCards);
    setGamePhase(newPhase);
    setDeck(deck); // Update deck state after dealing cards

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
  };

  useEffect(() => {
    dealNewHand();
  }, []);

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

    // Check if betting round is complete and advance phase if needed
    const activePlayers = newPlayers.filter(p => !p.hasFolded);
    if (activePlayers.length <= 1) {
      // Game should end if only one player remains
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      // Determine winner immediately since no more betting needed
      setTimeout(() => {
        determineWinner();
      }, 500);
    } else {
      // AI makes strategic decision
      const aiPlayerIndex = newPlayers.findIndex(p => !p.isHuman && !p.hasFolded);
      if (aiPlayerIndex !== -1) {
        const aiPlayer = newPlayers[aiPlayerIndex];
        const activePlayersCount = newPlayers.filter(p => !p.hasFolded).length;

        // Get AI decision based on hand strength and game state
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

        switch (aiDecision.action) {
          case 'fold':
            newPlayers[aiPlayerIndex] = {
              ...aiPlayer,
              hasFolded: true,
            };
            break;

          case 'call':
            aiBetAmount = Math.max(0, newCurrentBet - aiPlayer.currentBet);
            if (aiPlayer.chips >= aiBetAmount) {
              newPlayers[aiPlayerIndex] = {
                ...aiPlayer,
                chips: aiPlayer.chips - aiBetAmount,
                currentBet: aiPlayer.currentBet + aiBetAmount,
              };
              newPot += aiBetAmount;
            }
            break;

          case 'raise':
            const raiseAmount = aiDecision.amount || 0;
            const totalRaiseAmount = newCurrentBet - aiPlayer.currentBet + raiseAmount;
            if (aiPlayer.chips >= totalRaiseAmount) {
              newPlayers[aiPlayerIndex] = {
                ...aiPlayer,
                chips: aiPlayer.chips - totalRaiseAmount,
                currentBet: aiPlayer.currentBet + totalRaiseAmount,
              };
              newPot += totalRaiseAmount;
              newCurrentBet = aiPlayer.currentBet + totalRaiseAmount;
            } else {
              // If can't raise the full amount, just call
              aiBetAmount = Math.max(0, newCurrentBet - aiPlayer.currentBet);
              if (aiPlayer.chips >= aiBetAmount) {
                newPlayers[aiPlayerIndex] = {
                  ...aiPlayer,
                  chips: aiPlayer.chips - aiBetAmount,
                  currentBet: aiPlayer.currentBet + aiBetAmount,
                };
                newPot += aiBetAmount;
              }
            }
            break;
        }

        setPot(newPot);
        setCurrentBet(newCurrentBet);
        setPlayers(newPlayers);
      }

      // Advance to next phase after both players have acted
      setTimeout(() => {
        advanceGamePhase();
      }, 1000); // Small delay for better UX
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Texas Hold'em Poker</h1>
        <p>A React + TypeScript Poker Game</p>
      </header>

      <main className="game-container">
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
