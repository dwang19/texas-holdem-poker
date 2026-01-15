import React from 'react';
import { Player } from '../game/types';
import Card from './Card';
import './PlayerArea.css';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer?: boolean;
  gamePhase?: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isCurrentPlayer = false,
  gamePhase = 'waiting'
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
      <div className="player-header">
        <div className="player-name-section">
          <h3 className="player-name">
            {player.name}
            {player.hasFolded && <span className="folded-text"> (FOLDED)</span>}
            {isCurrentPlayer && !player.hasFolded && <span className="current-indicator"> ← YOUR TURN</span>}
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
      </div>

      <div className="player-cards">
        <div className="cards-row">
          {player.cards.map((card, index) => (
            <Card
              key={`${player.id}-${index}`}
              card={card}
              hidden={(!player.isHuman && gamePhase !== 'showdown') || player.hasFolded}
              size="medium"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;