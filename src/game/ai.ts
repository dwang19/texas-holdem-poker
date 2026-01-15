import { Card, Player, GameState } from './types';
import { evaluateHand, compareHands } from './pokerLogic';

export type AIDecision = 'fold' | 'call' | 'raise';
export type AIPersonality = 'aggressive' | 'conservative' | 'balanced';

export interface AIDecisionResult {
  action: AIDecision;
  amount?: number;
  reasoning: string;
}

/**
 * AI decision making system for Texas Hold'em poker
 * Evaluates hand strength and makes strategic betting decisions
 */

export class PokerAI {
  private personality: AIPersonality;

  constructor(personality: AIPersonality = 'balanced') {
    this.personality = personality;
  }

  /**
   * Main decision making function for AI players
   */
  makeDecision(
    player: Player,
    communityCards: Card[],
    currentBet: number,
    pot: number,
    gamePhase: GameState['phase'],
    activePlayersCount: number
  ): AIDecisionResult {
    if (!player.cards || player.cards.length === 0) {
      return { action: 'fold', reasoning: 'No cards to evaluate' };
    }

    // Evaluate hand strength (0-1 scale)
    const handStrength = this.evaluateHandStrength(player.cards, communityCards, gamePhase);

    // Calculate pot odds
    const potOdds = this.calculatePotOdds(player, currentBet, pot);

    // Calculate call amount needed
    const callAmount = Math.max(0, currentBet - player.currentBet);

    // Make decision based on personality and hand strength
    return this.decideAction(handStrength, potOdds, callAmount, player.chips, gamePhase, activePlayersCount);
  }

  /**
   * Evaluate hand strength on a scale of 0-1
   * 0 = worst possible hand, 1 = nuts (best possible hand)
   */
  private evaluateHandStrength(holeCards: Card[], communityCards: Card[], phase: GameState['phase']): number {
    if (holeCards.length !== 2) return 0;

    // Get current available cards based on game phase
    let availableCards = [...holeCards];
    switch (phase) {
      case 'preflop':
        // Only hole cards available
        break;
      case 'flop':
        availableCards = [...holeCards, ...communityCards.slice(0, 3)];
        break;
      case 'turn':
        availableCards = [...holeCards, ...communityCards.slice(0, 4)];
        break;
      case 'river':
      case 'showdown':
        availableCards = [...holeCards, ...communityCards];
        break;
    }

    // Evaluate current hand
    const currentHand = evaluateHand(holeCards, availableCards.slice(2));

    // Calculate hand rank (1-10 scale)
    const handRank = currentHand.rank;

    // Consider potential for improvement based on game phase
    let potentialMultiplier = 1.0;

    if (phase === 'preflop') {
      // High potential for improvement
      potentialMultiplier = this.calculatePreflopPotential(holeCards);
    } else if (phase === 'flop') {
      // Medium potential for improvement
      potentialMultiplier = this.calculatePostflopPotential(holeCards, communityCards.slice(0, 3));
    } else if (phase === 'turn') {
      // Low potential for improvement
      potentialMultiplier = 0.8;
    }

    // Normalize to 0-1 scale
    const baseStrength = (handRank - 1) / 9; // 0-1 scale
    const finalStrength = Math.min(1.0, baseStrength * potentialMultiplier);

    return finalStrength;
  }

  /**
   * Calculate preflop hand potential
   */
  private calculatePreflopPotential(holeCards: Card[]): number {
    const [card1, card2] = holeCards;
    const isSuited = card1.suit === card2.suit;
    const isPair = card1.rank === card2.rank;
    const highCard = Math.max(card1.rank, card2.rank);
    const lowCard = Math.min(card1.rank, card2.rank);

    // Premium hands
    if (isPair && highCard >= 11) return 1.5; // Pocket Jacks or better
    if (isPair && highCard >= 8) return 1.3; // Pocket 8s-10s
    if (highCard === 14 && lowCard >= 10) return 1.4; // Ace-high with good kicker
    if (isSuited && highCard >= 12 && lowCard >= 10) return 1.3; // Suited connectors

    // Good hands
    if (isPair) return 1.1; // Any pocket pair
    if (isSuited && Math.abs(highCard - lowCard) <= 4) return 1.2; // Suited connectors/gappers
    if (highCard >= 12) return 1.0; // High cards

    // Medium hands
    if (isSuited) return 0.9; // Any suited
    if (Math.abs(highCard - lowCard) <= 4) return 0.8; // Connectors

    // Weak hands
    return 0.6;
  }

  /**
   * Calculate postflop improvement potential
   */
  private calculatePostflopPotential(holeCards: Card[], communityCards: Card[]): number {
    const allCards = [...holeCards, ...communityCards];
    const currentHand = evaluateHand(holeCards, communityCards);

    // Count outs (cards that could improve our hand significantly)
    let outs = 0;

    // Flush draws
    const suitCounts = allCards.reduce((counts, card) => {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const flushSuit = Object.entries(suitCounts).find(([_, count]) => count >= 4)?.[0];
    if (flushSuit && holeCards.some(card => card.suit === flushSuit)) {
      outs += 9; // Flush draw
    }

    // Straight draws
    const ranks = allCards.map(c => c.rank).sort((a, b) => b - a);
    const uniqueRanks = Array.from(new Set(ranks));

    // Check for open-ended straight draws
    for (let i = 0; i < uniqueRanks.length - 3; i++) {
      const sequence = uniqueRanks.slice(i, 4);
      if (sequence.every((rank, idx) => idx === 0 || rank === sequence[idx - 1] - 1)) {
        if (holeCards.some(card => sequence.includes(card.rank))) {
          outs += 8; // Open-ended straight draw
          break;
        }
      }
    }

    // Calculate potential based on outs
    const improvementPotential = Math.min(1.0, outs / 20); // 20 outs = very strong draw

    return 0.8 + improvementPotential * 0.4; // Base 0.8, up to 1.2
  }

  /**
   * Calculate pot odds (ratio of bet to pot)
   */
  private calculatePotOdds(player: Player, currentBet: number, pot: number): number {
    const callAmount = Math.max(0, currentBet - player.currentBet);
    if (callAmount === 0) return 0; // No bet to call

    return callAmount / (pot + callAmount);
  }

  /**
   * Make the final decision based on hand strength, pot odds, and personality
   */
  private decideAction(
    handStrength: number,
    potOdds: number,
    callAmount: number,
    playerChips: number,
    phase: GameState['phase'],
    activePlayersCount: number
  ): AIDecisionResult {
    // Adjust thresholds based on personality
    const thresholds = this.getPersonalityThresholds();

    // If we have no chips or can't call, fold
    if (callAmount > playerChips) {
      return { action: 'fold', reasoning: 'Insufficient chips to call' };
    }

    // Check if it's profitable to call (hand strength vs pot odds)
    const shouldCall = handStrength >= potOdds;

    // Decision logic based on hand strength
    if (handStrength >= thresholds.raise) {
      // Strong hand - raise or call
      if (this.shouldRaise(handStrength, callAmount, playerChips, phase)) {
        const raiseAmount = this.calculateRaiseAmount(callAmount, playerChips, handStrength, phase);
        return {
          action: 'raise',
          amount: raiseAmount,
          reasoning: `Strong hand (${(handStrength * 100).toFixed(0)}% strength) - raising`
        };
      } else {
        return {
          action: 'call',
          reasoning: `Strong hand (${(handStrength * 100).toFixed(0)}% strength) - calling`
        };
      }
    } else if (handStrength >= thresholds.call) {
      // Medium hand - call if profitable
      if (shouldCall || this.isBluffOpportunity(phase, activePlayersCount)) {
        return {
          action: 'call',
          reasoning: `Decent hand (${(handStrength * 100).toFixed(0)}% strength) - calling`
        };
      } else {
        return { action: 'fold', reasoning: 'Hand too weak and pot odds unfavorable' };
      }
    } else {
      // Weak hand - usually fold, but sometimes bluff
      if (this.shouldBluff(handStrength, phase, activePlayersCount, potOdds)) {
        const raiseAmount = this.calculateRaiseAmount(callAmount, playerChips, handStrength, phase);
        return {
          action: 'raise',
          amount: raiseAmount,
          reasoning: 'Bluffing with weak hand'
        };
      } else if (shouldCall && handStrength >= thresholds.fold) {
        return { action: 'call', reasoning: 'Calling with weak hand due to pot odds' };
      } else {
        return { action: 'fold', reasoning: 'Weak hand - folding' };
      }
    }
  }

  /**
   * Get decision thresholds based on AI personality
   */
  private getPersonalityThresholds() {
    switch (this.personality) {
      case 'aggressive':
        return { raise: 0.6, call: 0.3, fold: 0.1 };
      case 'conservative':
        return { raise: 0.8, call: 0.5, fold: 0.2 };
      case 'balanced':
      default:
        return { raise: 0.7, call: 0.4, fold: 0.15 };
    }
  }

  /**
   * Decide whether to raise instead of just calling
   */
  private shouldRaise(handStrength: number, callAmount: number, playerChips: number, phase: GameState['phase']): boolean {
    // Don't raise if we don't have enough chips
    if (callAmount * 3 > playerChips) return false;

    // More likely to raise in early positions/early phases
    const raiseProbability = handStrength * (phase === 'preflop' ? 1.2 : 0.8);

    // Aggressive AI raises more often
    if (this.personality === 'aggressive') {
      return Math.random() < Math.min(0.8, raiseProbability + 0.2);
    } else if (this.personality === 'conservative') {
      return Math.random() < Math.max(0.1, raiseProbability - 0.2);
    } else {
      return Math.random() < raiseProbability;
    }
  }

  /**
   * Calculate appropriate raise amount
   */
  private calculateRaiseAmount(callAmount: number, playerChips: number, handStrength: number, phase: GameState['phase']): number {
    const minRaise = callAmount + 1;
    const maxRaise = Math.min(playerChips - callAmount, callAmount * 4);

    if (maxRaise <= minRaise) return minRaise;

    // Stronger hands raise more
    const raiseMultiplier = 1 + (handStrength * 2);

    // Aggressive AI raises more
    const personalityMultiplier = this.personality === 'aggressive' ? 1.5 :
                                 this.personality === 'conservative' ? 0.7 : 1.0;

    const targetRaise = callAmount * raiseMultiplier * personalityMultiplier;
    const finalRaise = Math.max(minRaise, Math.min(maxRaise, targetRaise));

    return Math.floor(finalRaise);
  }

  /**
   * Check if this is a good bluffing opportunity
   */
  private isBluffOpportunity(phase: GameState['phase'], activePlayersCount: number): boolean {
    // Only bluff in certain situations
    if (phase === 'preflop' || activePlayersCount > 2) return false;

    // Aggressive AI bluffs more
    const bluffChance = this.personality === 'aggressive' ? 0.3 :
                       this.personality === 'conservative' ? 0.05 : 0.15;

    return Math.random() < bluffChance;
  }

  /**
   * Decide whether to attempt a bluff
   */
  private shouldBluff(handStrength: number, phase: GameState['phase'], activePlayersCount: number, potOdds: number): boolean {
    // Only bluff with very weak hands
    if (handStrength > 0.2) return false;

    // Only bluff in late game phases
    if (phase === 'preflop' || phase === 'flop') return false;

    // Only bluff in heads-up situations
    if (activePlayersCount > 2) return false;

    // Only bluff if pot odds are reasonable
    if (potOdds > 0.3) return false;

    // Aggressive AI bluffs more
    const bluffChance = this.personality === 'aggressive' ? 0.2 : 0.05;

    return Math.random() < bluffChance;
  }
}

/**
 * Factory function to create AI instances with different personalities
 */
export const createAI = (personality: AIPersonality = 'balanced'): PokerAI => {
  return new PokerAI(personality);
};

/**
 * Utility function to get AI decision for a player
 */
export const getAIDecision = (
  player: Player,
  communityCards: Card[],
  currentBet: number,
  pot: number,
  gamePhase: GameState['phase'],
  activePlayersCount: number,
  personality: AIPersonality = 'balanced'
): AIDecisionResult => {
  const ai = createAI(personality);
  return ai.makeDecision(player, communityCards, currentBet, pot, gamePhase, activePlayersCount);
};