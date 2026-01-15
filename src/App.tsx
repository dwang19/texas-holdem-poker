// Test change for GitHub push capability - added by AI assistant
import React, { useState, useEffect } from 'react';
import Card from './components/Card';
import { Deck, createDeck } from './game/deck';
import { Card as CardType } from './game/types';
import './App.css';

function App() {
  const [deck, setDeck] = useState<Deck>(createDeck());
  const [playerCards, setPlayerCards] = useState<CardType[]>([]);
  const [aiCards, setAiCards] = useState<CardType[]>([]);
  const [communityCards, setCommunityCards] = useState<CardType[]>([]);

  const dealNewHand = () => {
    const newDeck = createDeck();
    const playerHand = newDeck.dealCards(2);
    const aiHand = newDeck.dealCards(2);
    const community = newDeck.dealCards(5);

    setDeck(newDeck);
    setPlayerCards(playerHand);
    setAiCards(aiHand);
    setCommunityCards(community);
  };

  useEffect(() => {
    dealNewHand();
  }, []);

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
          <div className="player-hand">
            <h3>Your Hand</h3>
            <div className="cards-row">
              {playerCards.map((card, index) => (
                <Card key={`player-${index}`} card={card} />
              ))}
            </div>
          </div>

          <div className="player-hand">
            <h3>AI Hand</h3>
            <div className="cards-row">
              {aiCards.map((card, index) => (
                <Card key={`ai-${index}`} card={card} hidden={true} />
              ))}
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="game-controls">
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
