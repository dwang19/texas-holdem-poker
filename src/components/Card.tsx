import React from 'react';
import { Card as CardType } from '../game/types';
import { getSuitSymbol, getSuitColor } from '../game/deck';
import './Card.css';

interface CardProps {
  card: CardType | null;
  hidden?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  hidden = false,
  size = 'medium',
  className = ''
}) => {
  if (!card) {
    return (
      <div className={`card card--empty card--${size} ${className}`}>
        <div className="card__back">
          <div className="card__pattern"></div>
        </div>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className={`card card--hidden card--${size} ${className}`}>
        <div className="card__back">
          <div className="card__pattern"></div>
        </div>
      </div>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);

  return (
    <div className={`card card--${size} ${className}`}>
      <div className="card__front">
        <div className="card__corner card__corner--top-left">
          <div className="card__rank" style={{ color: suitColor }}>
            {card.displayRank}
          </div>
          <div className="card__suit" style={{ color: suitColor }}>
            {suitSymbol}
          </div>
        </div>

        <div className="card__center">
          <div className="card__suit-large" style={{ color: suitColor }}>
            {suitSymbol}
          </div>
        </div>

        <div className="card__corner card__corner--bottom-right">
          <div className="card__rank card__rank--rotated" style={{ color: suitColor }}>
            {card.displayRank}
          </div>
          <div className="card__suit card__suit--rotated" style={{ color: suitColor }}>
            {suitSymbol}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;