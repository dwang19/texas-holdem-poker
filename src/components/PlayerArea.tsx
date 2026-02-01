import React from 'react';
import { Player } from '../game/types';
import Card from './Card';
import './PlayerArea.css';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer?: boolean;
  gamePhase?: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  holeCardAnimating?: boolean;
  lastAction?: string;
  aiCardsFlipping?: boolean;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isCurrentPlayer = false,
  gamePhase = 'waiting',
  holeCardAnimating = false,
  lastAction = '',
  aiCardsFlipping = false
}) => {
  const getPositionIndicators = () => {
    const indicators = [];
    if (player.isDealer) indicators.push('D');
    if (player.isSmallBlind) indicators.push('SB');
    if (player.isBigBlind) indicators.push('BB');
    return indicators;
  };

  const positionIndicators = getPositionIndicators();

  return (
    <div className={`player-area ${player.hasFolded ? 'folded' : ''} ${isCurrentPlayer ? 'current-player' : ''}`}>
      {/* Turn Indicator Badge */}
      {isCurrentPlayer && !player.hasFolded && (
        <div className="turn-indicator">
          <div className="turn-arrow">⬇</div>
          <div className="turn-text">TURN</div>
        </div>
      )}

      <div className="player-header">
        <div className="player-name-section">
          <h3 className="player-name">
            {player.name}
            {player.hasFolded && <span className="folded-text"> (FOLDED)</span>}
          </h3>
          {positionIndicators.length > 0 && (
            <div className="position-indicators">
              {positionIndicators.map(indicator => (
                <span key={indicator} className="position-badge">{indicator}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="player-chips">
        <div className="chip-stack">
          <div className="chip-icon">💰</div>
          <span className="chip-amount">${player.chips.toLocaleString()}</span>
        </div>
        {player.currentBet > 0 && (
          <div className="current-bet">
            <span className="bet-label">Bet:</span>
            <span className="bet-amount">${player.currentBet}</span>
          </div>
        )}
        <div className={`last-action ${lastAction ? '' : 'hidden'}`}>
          <span className="action-label">Last:</span>
          <span className="action-value">{lastAction || '\u00A0'}</span>
        </div>
      </div>

      <div className="player-cards">
        <div className="cards-row">
          {player.cards.map((card, index) => {
            // For AI cards during showdown flip, show as hidden initially, then flip
            const shouldFlip = !player.isHuman && aiCardsFlipping && gamePhase === 'showdown' && !player.hasFolded;
            const shouldHide = (!player.isHuman && gamePhase !== 'showdown' && !shouldFlip) || player.hasFolded;
            
            // Debug logging for AI player cards
            if (!player.isHuman && gamePhase === 'showdown') {
              console.log(`DEBUG PlayerArea: AI card ${index} - shouldFlip: ${shouldFlip}, aiCardsFlipping: ${aiCardsFlipping}, gamePhase: ${gamePhase}, hasFolded: ${player.hasFolded}`);
            }
            
            return (
              <Card
                key={`${player.id}-${index}`}
                card={card}
                hidden={shouldHide}
                size="medium"
                isDealing={holeCardAnimating}
                isFlipping={shouldFlip}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;