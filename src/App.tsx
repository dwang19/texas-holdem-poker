// Test change for GitHub push capability - added by AI assistant
import React, { useState, useEffect } from 'react';
import Card from './components/Card';
import { Deck, createDeck } from './game/deck';
import { Card as CardType, Player, GameState } from './game/types';
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

  const dealNewHand = () => {
    const newDeck = createDeck();

    // Deal hole cards to players
    const humanPlayer = players.find(p => p.isHuman)!;
    const aiPlayer = players.find(p => !p.isHuman)!;

    const humanHand = newDeck.dealCards(2);
    const aiHand = newDeck.dealCards(2);

    // Deal community cards (but only show flop initially in real poker)
    const community = newDeck.dealCards(5);

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
    setCommunityCards(community);
    setPot(SMALL_BLIND + BIG_BLIND);
    setCurrentBet(BIG_BLIND);
    setCurrentPlayerIndex(0); // Start with human player (after blinds)
    setGamePhase('preflop');
    setRaiseAmount('');
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

    // Move to next player (simplified - in real poker this would be more complex)
    const activePlayers = newPlayers.filter(p => !p.hasFolded);
    if (activePlayers.length > 1) {
      let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      while (newPlayers[nextPlayerIndex].hasFolded) {
        nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
      }
      setCurrentPlayerIndex(nextPlayerIndex);
    } else {
      // Game should end if only one player remains
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
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
            {communityCards.map((card, index) => (
              <Card key={`community-${index}`} card={card} />
            ))}
          </div>
        </div>

        {/* Player Hands */}
        <div className="players-section">
          {players.map((player) => (
            <div key={player.id} className={`player-hand ${player.hasFolded ? 'folded' : ''}`}>
              <h3>{player.name} {player.hasFolded && '(FOLDED)'}</h3>
              <p>Chips: ${player.chips} | Current Bet: ${player.currentBet}</p>
              <div className="cards-row">
                {player.cards.map((card, index) => (
                  <Card
                    key={`${player.id}-${index}`}
                    card={card}
                    hidden={(!player.isHuman && gamePhase !== 'showdown') || player.hasFolded}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Game Controls */}
        <div className="game-controls">
          <div className="game-info">
            <p>Pot: ${pot}</p>
            <p>Current Bet: ${currentBet}</p>
            <p>Phase: {gamePhase}</p>
            <p>Current Player: {players[currentPlayerIndex]?.name || 'None'}</p>
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

          <button onClick={dealNewHand} className="deal-button">
            Deal New Hand
          </button>
          <p>Cards remaining in deck: {deck.getRemainingCards()}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
