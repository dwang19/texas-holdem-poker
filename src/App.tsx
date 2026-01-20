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
      hasActedThisRound: false,
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
      hasActedThisRound: false,
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
  const [aiPersonality] = useState<AIPersonality>('balanced'); // Hardcoded to balanced
  const [winner, setWinner] = useState<Player | null>(null);
  const [handComplete, setHandComplete] = useState<boolean>(false);
  const [showdownData, setShowdownData] = useState<{
    hands: { player: Player; pokerHand: PokerHand; isWinner: boolean }[];
    communityCardsUsed: CardType[];
    potAmount: number;
  } | null>(null);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [animatingCardIndices, setAnimatingCardIndices] = useState<number[]>([]);
  const [burnAnimatingIndex, setBurnAnimatingIndex] = useState<number | null>(null);
  const [holeCardAnimating, setHoleCardAnimating] = useState<boolean>(false);
  const [aiActionDisplay, setAiActionDisplay] = useState<{action: string, amount?: number, isThinking: boolean} | null>(null);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState<string | null>(null);
  const [playerLastActions, setPlayerLastActions] = useState<Record<string, string>>({});
  const [actingPlayerId, setActingPlayerId] = useState<string | null>(null);
  const [gameLog, setGameLog] = useState<Array<{timestamp: Date, message: string}>>([]);
  const [aiCardsFlipping, setAiCardsFlipping] = useState<boolean>(false);
  const [lastPotWon, setLastPotWon] = useState<number>(0);

  // Start the game with initialization parameters
  const startGame = () => {
    console.log('DEBUG: startGame called');
    const initialPlayers = getInitialPlayers(humanPlayerName, humanIsDealerFirst);
    setPlayers(initialPlayers);
    setGameStarted(true);
    setRoundNumber(1);
    setGameOver(false);
    setOverallWinner(null);
    setGameLog([{ timestamp: new Date(), message: `Game started! ${humanPlayerName} vs AI Player` }]);
    // Trigger the first hand deal
    setTimeout(() => {
      dealNewHand();
    }, 100);
  };

  // Reset game to initial state
  const resetGame = () => {
    console.log('DEBUG: resetGame called');
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

  // Handle fold win - when someone folds, award pot immediately without revealing cards
  const handleFoldWin = (remainingPlayer: Player) => {
    console.log('DEBUG: handleFoldWin called for', remainingPlayer.name);
    console.log('DEBUG: handleFoldWin - current pot:', pot);
    console.log('DEBUG: handleFoldWin - current players:', players.map(p => ({ name: p.name, chips: p.chips, hasFolded: p.hasFolded })));
    
    const potAmount = pot;
    handleFoldWinWithPot(remainingPlayer, potAmount, players);
  };

  // Helper function that accepts pot and players as parameters to avoid stale closure issues
  const handleFoldWinWithPot = (remainingPlayer: Player, potAmount: number, currentPlayers: Player[]) => {
    console.log('DEBUG: handleFoldWinWithPot called for', remainingPlayer.name);
    console.log('DEBUG: handleFoldWinWithPot - potAmount:', potAmount);
    console.log('DEBUG: handleFoldWinWithPot - current players:', currentPlayers.map(p => ({ name: p.name, chips: p.chips, hasFolded: p.hasFolded })));
    
    const updatedPlayers = currentPlayers.map(player =>
      player.id === remainingPlayer.id
        ? { ...player, chips: player.chips + potAmount }
        : player
    );

    console.log('DEBUG: handleFoldWinWithPot - updated players:', updatedPlayers.map(p => ({ name: p.name, chips: p.chips })));
    console.log('DEBUG: handleFoldWinWithPot - setting handComplete to true');
    
    setPlayers(updatedPlayers);
    setWinner(remainingPlayer);
    setLastPotWon(potAmount); // Store pot amount for winner announcement
    setPot(0);
    setHandComplete(true);
    setGamePhase('showdown'); // Set to showdown so UI can show winner, but no card reveal
    setCurrentPlayerIndex(-1); // Ensure currentPlayerIndex is -1 to disable action buttons
    
    // Don't set showdown data - no need to show hands when someone folds
    setShowdownData(null);
    
    // Add simple message to game log
    setGameLog(prev => [...prev, { 
      timestamp: new Date(), 
      message: `${remainingPlayer.name} wins $${potAmount} - opponent folded` 
    }]);

    // Check for bust condition
    const bustedPlayers = updatedPlayers.filter(p => p.chips <= 0);
    if (bustedPlayers.length > 0) {
      const remainingPlayers = updatedPlayers.filter(p => p.chips > 0);
      const gameWinner = remainingPlayers[0];
      setOverallWinner(gameWinner);
      setGameOver(true);
      console.log('DEBUG: handleFoldWinWithPot - game over, winner:', gameWinner.name);
    } else {
      console.log('DEBUG: handleFoldWinWithPot - hand complete, waiting for next round button');
    }
  };

  const determineWinner = () => {
    console.log('DEBUG: determineWinner called');
    const activePlayers = players.filter(p => !p.hasFolded);

    let updatedPlayers = [...players];
    let winningPlayer: Player;
    let showdownHands: { player: Player; pokerHand: PokerHand; isWinner: boolean }[] = [];
    let communityCardsUsed: CardType[] = [];
    
    // Store the pot amount before resetting it
    const potAmount = pot;

    if (activePlayers.length === 1) {
      // Only one player left, they win by default
      winningPlayer = activePlayers[0];
      updatedPlayers = updatedPlayers.map(player =>
        player.id === winningPlayer.id
          ? { ...player, chips: player.chips + potAmount }
          : player
      );

      // For showdown display, still evaluate the hand
      const playerHand = evaluateHand(winningPlayer.cards, communityCards);
      showdownHands = [{
        player: winningPlayer,
        pokerHand: playerHand,
        isWinner: true
      }];
      communityCardsUsed = playerHand.cards.filter(card =>
        communityCards.some(commCard => commCard.rank === card.rank && commCard.suit === card.suit)
      );
    } else {
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

      winningPlayer = playerHands[bestHandIndex].player;

      // Award the pot to the winner
      updatedPlayers = updatedPlayers.map(player =>
        player.id === winningPlayer.id
          ? { ...player, chips: player.chips + potAmount }
          : player
      );

      // Prepare showdown data for all active players
      showdownHands = playerHands.map((ph, index) => ({
        player: ph.player,
        pokerHand: ph.hand,
        isWinner: index === bestHandIndex
      }));

      // Get community cards used in the winning hand
      communityCardsUsed = playerHands[bestHandIndex].hand.cards.filter(card =>
        communityCards.some(commCard => commCard.rank === card.rank && commCard.suit === card.suit)
      );
    }

    // Set showdown data for display
    setShowdownData({
      hands: showdownHands,
      communityCardsUsed,
      potAmount: potAmount
    });

    setPlayers(updatedPlayers);
    setWinner(winningPlayer);
    setLastPotWon(potAmount); // Store pot amount for winner announcement
    // Reset pot to 0 after awarding it to the winner
    setPot(0);
    console.log('DEBUG: Setting handComplete to true in determineWinner');
    setHandComplete(true);
    
    // Add to game log with detailed hand comparison
    const winningHandDesc = showdownHands.find(h => h.isWinner)?.pokerHand.description || 'best hand';
    if (showdownHands.length > 1) {
      // Show comparison in game log
      const losingHand = showdownHands.find(h => !h.isWinner);
      const losingHandDesc = losingHand?.pokerHand.description || 'unknown hand';
      setGameLog(prev => [...prev, { 
        timestamp: new Date(), 
        message: `${winningPlayer.name} wins $${potAmount} with ${winningHandDesc} (beats ${losingHand?.player.name}'s ${losingHandDesc})` 
      }]);
    } else {
      setGameLog(prev => [...prev, { timestamp: new Date(), message: `${winningPlayer.name} wins $${potAmount} with ${winningHandDesc}` }]);
    }

    // Check for bust condition (player with $0 chips) - happens in both cases
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
    console.log('DEBUG: dealNewHand called, current players chips:', players.map(p => ({ name: p.name, chips: p.chips })));
    setGameLog(prev => [...prev, { timestamp: new Date(), message: `Round ${roundNumber} - New hand dealt` }]);
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
      hasActedThisRound: false, // Reset for new betting round
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
    console.log('DEBUG: Setting handComplete to false in dealNewHand');
    setHandComplete(false);
    setPlayerLastActions({}); // Reset last actions for new hand
    setActingPlayerId(null); // Clear acting player
    setShowdownData(null); // Clear showdown data
    setAiCardsFlipping(false); // Reset flip animation state
    setLastPotWon(0); // Reset last pot won

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

  // Start next round with dealer rotation (chips persist across hands)
  const startNextRound = () => {
    console.log('DEBUG: startNextRound called, current players chips:', players.map(p => ({ name: p.name, chips: p.chips })));
    // Rotate dealer/button positions - chips persist across hands
    const nextRoundPlayers = players.map(player => ({
      ...player,
      // chips persist - do not reset
      isDealer: !player.isDealer,
      isSmallBlind: !player.isSmallBlind,
      isBigBlind: !player.isBigBlind,
    }));

    setPlayers(nextRoundPlayers);
    setRoundNumber(roundNumber + 1);
    setWinner(null);
    console.log('DEBUG: Setting handComplete to false in startNextRound');
    setHandComplete(false);
    setShowdownData(null); // Clear showdown data
    setAiCardsFlipping(false); // Reset flip animation state
    setLastPotWon(0); // Reset last pot won

    // Start new hand after a brief delay
    setTimeout(() => {
      dealNewHand();
    }, 500);
  };

  // Function to transition to the next game phase
  const advanceGamePhase = () => {
    console.log('DEBUG: advanceGamePhase called, players at start:', players.map(p => ({ name: p.name, chips: p.chips })));
    const activePlayers = players.filter(p => !p.hasFolded);

    // If only one player remains (someone folded), award pot immediately
    if (activePlayers.length <= 1) {
      console.log('DEBUG: advanceGamePhase - only one active player, awarding pot');
      setCurrentPlayerIndex(-1);
      setTimeout(() => {
        // Use functional updates to get latest state
        setPot(prevPot => {
          setPlayers(prevPlayers => {
            const latestActivePlayers = prevPlayers.filter(p => !p.hasFolded);
            if (latestActivePlayers.length === 1) {
              handleFoldWinWithPot(latestActivePlayers[0], prevPot, prevPlayers);
            }
            return prevPlayers;
          });
          return prevPot;
        });
      }, 500);
      return;
    }

    // Check if all active players are all-in (have bet all their chips)
    const allPlayersAllIn = activePlayers.every(player => player.chips === 0);
    if (allPlayersAllIn) {
      console.log('All active players are all-in, going to showdown');
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      setTimeout(() => {
        determineWinner();
      }, 500);
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
        setGameLog(prev => [...prev, { timestamp: new Date(), message: 'Flop dealt - 3 community cards revealed' }]);
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(3);
        newCommunityCards = cardsToDeal;
        newPhase = 'flop';
        break;
      case 'flop':
        // Burn 1 card, then deal turn (1 more community card)
        setGameLog(prev => [...prev, { timestamp: new Date(), message: 'Turn dealt - 4th community card revealed' }]);
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'turn';
        break;
      case 'turn':
        // Burn 1 card, then deal river (1 more community card)
        setGameLog(prev => [...prev, { timestamp: new Date(), message: 'River dealt - 5th community card revealed' }]);
        newBurnedCards.push(deck.dealCard()!);
        cardsToDeal = deck.dealCards(1);
        newCommunityCards = [...communityCards, ...cardsToDeal];
        newPhase = 'river';
        break;
      case 'river':
        // Move to showdown
        setGameLog(prev => [...prev, { timestamp: new Date(), message: 'Showdown! Revealing all hands' }]);
        newPhase = 'showdown';
        setCurrentPlayerIndex(-1);
        setGamePhase('showdown'); // Set phase immediately so flip animation can work
        
        // Check if both players are still active (showdown scenario)
        const activePlayersAtShowdown = players.filter(p => !p.hasFolded);
        console.log('DEBUG: River to Showdown - activePlayersAtShowdown:', activePlayersAtShowdown.length);
        if (activePlayersAtShowdown.length > 1) {
          // Trigger flip animation for AI cards
          console.log('DEBUG: Triggering AI card flip animation');
          setAiCardsFlipping(true);
          // After flip animation completes, determine winner
          setTimeout(() => {
            determineWinner();
            setIsDealing(false);
            // Reset flip animation state after animation completes
            setTimeout(() => {
              setAiCardsFlipping(false);
            }, 1000); // Match animation duration
          }, 1000); // Wait for flip animation
        } else {
          // Only one player left, no flip needed
          console.log('DEBUG: Only one player active, skipping flip animation');
          setTimeout(() => {
            determineWinner();
            setIsDealing(false);
          }, 500);
        }
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

                // Reset current bets for new betting round using functional update to get latest state
                setPlayers(prevPlayers => {
                  console.log('DEBUG: Flop phase transition - players before reset:', prevPlayers.map(p => ({ name: p.name, chips: p.chips })));
                  const resetBetPlayers = prevPlayers.map(player => ({
                    ...player,
                    currentBet: 0,
                    hasActedThisRound: false, // Reset for new betting round
                  }));
                  console.log('DEBUG: Flop phase transition - players after reset:', resetBetPlayers.map(p => ({ name: p.name, chips: p.chips })));
                  
                  // Find first active player for new betting round
                  const firstActivePlayerIndex = resetBetPlayers.findIndex(p => !p.hasFolded);
                  setCurrentPlayerIndex(firstActivePlayerIndex);
                  
                  return resetBetPlayers;
                });
                setCurrentBet(0);

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

            // Reset current bets for new betting round using functional update to get latest state
            setPlayers(prevPlayers => {
              console.log('DEBUG: Phase transition - players before reset:', prevPlayers.map(p => ({ name: p.name, chips: p.chips })));
              const resetBetPlayers = prevPlayers.map(player => ({
                ...player,
                currentBet: 0,
                hasActedThisRound: false, // Reset for new betting round
              }));
              console.log('DEBUG: Phase transition - players after reset:', resetBetPlayers.map(p => ({ name: p.name, chips: p.chips })));
              
              // Find first active player for new betting round
              const firstActivePlayerIndex = resetBetPlayers.findIndex(p => !p.hasFolded);
              setCurrentPlayerIndex(firstActivePlayerIndex);
              
              return resetBetPlayers;
            });
            setCurrentBet(0);

            // Clear phase announcement after animation
            setTimeout(() => {
              setPhaseAnnouncement(null);
            }, 2500);
          }, 1200); // Wait for single card dealing animation
        }
      }, 1000); // Wait for burn animation
    }
  };

  // Function to check if betting round is complete
  const isBettingRoundComplete = (players: Player[], currentBet: number): boolean => {
    const activePlayers = players.filter(p => !p.hasFolded);
    if (activePlayers.length <= 1) return true;

    // All active players must have acted in this round AND matched the current bet
    return activePlayers.every(player =>
      player.hasActedThisRound && player.currentBet === currentBet
    );
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

  // Validation functions for betting actions
  const validateFoldAction = (player: Player, gamePhase: string): { valid: boolean; reason?: string } => {
    // Fold should always be allowed during betting phases
    const bettingPhases = ['preflop', 'flop', 'turn', 'river'];
    if (!bettingPhases.includes(gamePhase)) {
      return { valid: false, reason: 'Cannot fold outside of betting rounds' };
    }

    if (player.hasFolded) {
      return { valid: false, reason: 'Player has already folded' };
    }

    return { valid: true };
  };

  const validateCallAction = (player: Player, currentBet: number, gamePhase: string): { valid: boolean; reason?: string; callAmount?: number } => {
    const bettingPhases = ['preflop', 'flop', 'turn', 'river'];
    if (!bettingPhases.includes(gamePhase)) {
      return { valid: false, reason: 'Cannot call outside of betting rounds' };
    }

    if (player.hasFolded) {
      return { valid: false, reason: 'Player has already folded' };
    }

    const callAmount = Math.max(0, currentBet - player.currentBet);

    if (callAmount > player.chips) {
      return { valid: false, reason: `Insufficient chips. Need $${callAmount} to call, but only have $${player.chips}` };
    }

    return { valid: true, callAmount };
  };

  const validateRaiseAction = (
    player: Player,
    currentBet: number,
    raiseAmountStr: string,
    gamePhase: string
  ): { valid: boolean; reason?: string; totalRaiseAmount?: number; minRaise?: number } => {
    const bettingPhases = ['preflop', 'flop', 'turn', 'river'];
    if (!bettingPhases.includes(gamePhase)) {
      return { valid: false, reason: 'Cannot raise outside of betting rounds' };
    }

    if (player.hasFolded) {
      return { valid: false, reason: 'Player has already folded' };
    }

    // Validate raise amount input
    const raiseAmount = parseInt(raiseAmountStr);
    if (isNaN(raiseAmount) || raiseAmount <= 0) {
      return { valid: false, reason: 'Invalid raise amount. Must be a positive number' };
    }

    // Calculate minimum raise (must at least match current bet plus raise amount)
    const callAmount = Math.max(0, currentBet - player.currentBet);
    const minRaise = callAmount + raiseAmount;

    if (minRaise > player.chips) {
      return { valid: false, reason: `Insufficient chips. Need at least $${minRaise} to raise, but only have $${player.chips}` };
    }

    // Additional validation: raise shouldn't be too small compared to current bet
    const minRaiseAmount = Math.max(1, Math.floor(currentBet * 0.5)); // At least half the current bet or $1 minimum
    if (raiseAmount < minRaiseAmount) {
      return { valid: false, reason: `Raise amount too small. Minimum raise is $${minRaiseAmount}` };
    }

    return { valid: true, totalRaiseAmount: minRaise, minRaise: raiseAmount };
  };

  const handleBettingAction = (action: 'fold' | 'call' | 'raise') => {
    const currentPlayer = players[currentPlayerIndex];

    // Set acting player indicator
    setActingPlayerId(currentPlayer.id);

    // Basic validation - only human player can trigger actions and only when it's their turn
    if (!currentPlayer || !currentPlayer.isHuman) {
      console.warn('Invalid action: Only human player can perform actions');
      setActingPlayerId(null);
      return;
    }

    // Ensure it's actually the human player's turn
    if (currentPlayerIndex < 0 || currentPlayerIndex >= players.length) {
      console.warn('Invalid action: No active player turn');
      return;
    }

    // Ensure the player hasn't already acted this round (additional safety check)
    if (currentPlayer.hasActedThisRound) {
      console.warn('Invalid action: Player has already acted this round');
      return;
    }

    // Action-specific validation
    let validationResult;
    switch (action) {
      case 'fold':
        validationResult = validateFoldAction(currentPlayer, gamePhase);
        break;
      case 'call':
        validationResult = validateCallAction(currentPlayer, currentBet, gamePhase);
        break;
      case 'raise':
        validationResult = validateRaiseAction(currentPlayer, currentBet, raiseAmount, gamePhase);
        break;
    }

    // If validation fails, show error and return
    if (!validationResult?.valid) {
      console.warn('Invalid action:', validationResult?.reason);
      alert(validationResult?.reason || 'Invalid action');
      return;
    }

    // Execute the validated action
    console.log('DEBUG: Betting action - action:', action, 'players before:', players.map(p => ({ name: p.name, chips: p.chips, currentBet: p.currentBet })));
    let newPlayers = [...players];
    let newPot = pot;
    let newCurrentBet = currentBet;

    // Track the action being taken
    let actionText = '';
    switch (action) {
      case 'fold':
        newPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          hasFolded: true,
          hasActedThisRound: true,
        };
        actionText = 'Fold';
        break;

      case 'call':
        const callValidation = validationResult as { valid: boolean; reason?: string; callAmount?: number };
        const callAmount = callValidation.callAmount!;
        newPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          chips: Math.max(0, currentPlayer.chips - callAmount),
          currentBet: currentPlayer.currentBet + callAmount,
          hasActedThisRound: true,
        };
        newPot += callAmount;
        actionText = `Call $${callAmount}`;
        break;

      case 'raise':
        const raiseValidation = validationResult as { valid: boolean; reason?: string; totalRaiseAmount?: number; minRaise?: number };
        const totalRaiseAmount = raiseValidation.totalRaiseAmount!;
        newPlayers[currentPlayerIndex] = {
          ...currentPlayer,
          chips: Math.max(0, currentPlayer.chips - totalRaiseAmount),
          currentBet: currentPlayer.currentBet + totalRaiseAmount,
          hasActedThisRound: true,
        };
        // When someone raises, it starts a new betting round - reset hasActedThisRound for all other players
        newPlayers = newPlayers.map((player, index) => ({
          ...player,
          hasActedThisRound: index === currentPlayerIndex ? true : false, // Only the raiser has acted
        }));
        newPot += totalRaiseAmount;
        newCurrentBet = currentPlayer.currentBet + totalRaiseAmount;
        setRaiseAmount(''); // Clear the input
        actionText = `Raise $${totalRaiseAmount}`;
        break;
    }

    // Update last action for this player
    setPlayerLastActions(prev => ({
      ...prev,
      [currentPlayer.id]: actionText
    }));

    // Add to game log
    setGameLog(prev => [...prev, { timestamp: new Date(), message: `${currentPlayer.name} ${actionText.toLowerCase()}` }]);

    console.log('DEBUG: Betting action - players after:', newPlayers.map(p => ({ name: p.name, chips: p.chips, currentBet: p.currentBet })));
    setPlayers(newPlayers);
    setPot(newPot);
    setCurrentBet(newCurrentBet);

    // Clear acting player indicator after a short delay
    setTimeout(() => {
      setActingPlayerId(null);
    }, 500);

    // Check if betting round is complete
    const bettingRoundComplete = isBettingRoundComplete(newPlayers, newCurrentBet);
    const activePlayers = newPlayers.filter(p => !p.hasFolded);

    // If someone folded and only one player remains, award pot immediately (no showdown, no card reveal)
    if (action === 'fold' && activePlayers.length === 1) {
      console.log('DEBUG: Player folded, awarding pot to remaining player');
      console.log('DEBUG: Fold action - activePlayers:', activePlayers.map(p => ({ name: p.name, chips: p.chips })));
      console.log('DEBUG: Fold action - newPlayers:', newPlayers.map(p => ({ name: p.name, hasFolded: p.hasFolded })));
      console.log('DEBUG: Fold action - current pot:', newPot);
      
      // Update state first
      setPlayers(newPlayers);
      setPot(newPot);
      setCurrentBet(newCurrentBet);
      setCurrentPlayerIndex(-1);
      
      // Then handle fold win with the values we already have (avoid stale closure)
      const remainingPlayer = activePlayers[0];
      const potToAward = newPot;
      setTimeout(() => {
        console.log('DEBUG: Fold setTimeout - calling handleFoldWinWithPot');
        handleFoldWinWithPot(remainingPlayer, potToAward, newPlayers);
      }, 500);
      return;
    }

    // Check if all active players are all-in (have 0 chips)
    const allPlayersAllIn = activePlayers.every(player => player.chips === 0);

    if (activePlayers.length <= 1 || allPlayersAllIn) {
      // Game should end if only one player remains or all are all-in
      console.log('Ending hand - active players:', activePlayers.length, 'all all-in:', allPlayersAllIn);
      
      // If only one player left (not due to fold, but due to all-in or other reasons), award pot
      if (activePlayers.length === 1) {
        console.log('DEBUG: handleBettingAction - only one player left (all-in scenario)');
        setCurrentPlayerIndex(-1);
        setTimeout(() => {
          // Use the values we have to avoid stale closure
          const remainingPlayer = activePlayers[0];
          const potToAward = newPot;
          handleFoldWinWithPot(remainingPlayer, potToAward, newPlayers);
        }, 500);
        return;
      }
      
      // Multiple players still active (all-in scenario) - go to showdown
      setGamePhase('showdown');
      setCurrentPlayerIndex(-1);
      
      // Trigger flip animation for AI cards
      setAiCardsFlipping(true);
      setTimeout(() => {
        determineWinner();
        // Reset flip animation state after animation completes
        setTimeout(() => {
          setAiCardsFlipping(false);
        }, 1000); // Match animation duration
      }, 1000); // Wait for flip animation
      return;
    }

    if (bettingRoundComplete) {
      // Advance to next phase
      console.log('DEBUG: About to call advanceGamePhase, updated players:', newPlayers.map(p => ({ name: p.name, chips: p.chips })));
      advanceGamePhase();
      return;
    }

    // Continue betting round - move to next player
    const nextPlayerIndex = getNextActivePlayerIndex(newPlayers, currentPlayerIndex);
    setCurrentPlayerIndex(nextPlayerIndex);

    // If next player is AI, let AI make decision
    if (nextPlayerIndex !== -1 && !newPlayers[nextPlayerIndex].isHuman && !newPlayers[nextPlayerIndex].hasFolded) {
      // Set acting player indicator
      setActingPlayerId(newPlayers[nextPlayerIndex].id);

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

        // Track AI action text
        let aiActionText = '';

        switch (aiDecision.action) {
          case 'fold':
            updatedPlayers[nextPlayerIndex] = {
              ...aiPlayer,
              hasFolded: true,
              hasActedThisRound: true,
            };
            setAiActionDisplay({ action: 'folds', isThinking: false });
            aiActionText = 'Fold';
            break;

          case 'call':
            aiBetAmount = Math.max(0, updatedCurrentBet - aiPlayer.currentBet);
            if (aiPlayer.chips >= aiBetAmount) {
              updatedPlayers[nextPlayerIndex] = {
                ...aiPlayer,
                chips: Math.max(0, aiPlayer.chips - aiBetAmount),
                currentBet: aiPlayer.currentBet + aiBetAmount,
                hasActedThisRound: true,
              };
              updatedPot += aiBetAmount;
              setAiActionDisplay({ action: 'calls', amount: aiBetAmount, isThinking: false });
              aiActionText = `Call $${aiBetAmount}`;
            }
            break;

          case 'raise':
            const raiseAmount = aiDecision.amount || 0;
            const callAmount = Math.max(0, updatedCurrentBet - aiPlayer.currentBet);
            const totalRaiseAmount = callAmount + raiseAmount;

            if (aiPlayer.chips >= totalRaiseAmount) {
              updatedPlayers[nextPlayerIndex] = {
                ...aiPlayer,
                chips: Math.max(0, aiPlayer.chips - totalRaiseAmount),
                currentBet: aiPlayer.currentBet + totalRaiseAmount,
                hasActedThisRound: true,
              };
              // When AI raises, it starts a new betting round - reset hasActedThisRound for all other players
              updatedPlayers = updatedPlayers.map((player, index) => ({
                ...player,
                hasActedThisRound: index === nextPlayerIndex ? true : false, // Only the AI raiser has acted
              }));
              updatedPot += totalRaiseAmount;
              updatedCurrentBet = aiPlayer.currentBet + totalRaiseAmount;
              setAiActionDisplay({ action: 'raises', amount: totalRaiseAmount, isThinking: false });
              aiActionText = `Raise $${totalRaiseAmount}`;
            } else {
              // If can't raise the full amount, just call
              const fallbackCallAmount = Math.max(0, updatedCurrentBet - aiPlayer.currentBet);
              if (aiPlayer.chips >= fallbackCallAmount) {
                updatedPlayers[nextPlayerIndex] = {
                  ...aiPlayer,
                  chips: Math.max(0, aiPlayer.chips - fallbackCallAmount),
                  currentBet: aiPlayer.currentBet + fallbackCallAmount,
                  hasActedThisRound: true,
                };
                updatedPot += fallbackCallAmount;
                setAiActionDisplay({ action: 'calls', amount: fallbackCallAmount, isThinking: false });
                aiActionText = `Call $${fallbackCallAmount}`;
              }
            }
            break;
        }

        // Update last action for AI player
        setPlayerLastActions(prev => ({
          ...prev,
          [aiPlayer.id]: aiActionText
        }));

        // Add to game log
        setGameLog(prev => [...prev, { timestamp: new Date(), message: `AI Player ${aiActionText.toLowerCase()}` }]);

        setPot(updatedPot);
        setCurrentBet(updatedCurrentBet);
        setPlayers(updatedPlayers);

        // Clear AI action display and acting player indicator after a delay
        setTimeout(() => {
          setAiActionDisplay(null);
          setActingPlayerId(null);
        }, 2500);

        // Check again if betting round is now complete after AI action
        const aiBettingRoundComplete = isBettingRoundComplete(updatedPlayers, updatedCurrentBet);
        const aiActivePlayers = updatedPlayers.filter(p => !p.hasFolded);

        // If AI folded and only one player remains, award pot immediately (no showdown, no card reveal)
        if (aiDecision.action === 'fold' && aiActivePlayers.length === 1) {
          console.log('DEBUG: AI folded, awarding pot to remaining player');
          setCurrentPlayerIndex(-1);
          setTimeout(() => {
            // Use the values we have to avoid stale closure
            const remainingPlayer = aiActivePlayers[0];
            const potToAward = updatedPot;
            handleFoldWinWithPot(remainingPlayer, potToAward, updatedPlayers);
          }, 500);
          return;
        }

        if (aiActivePlayers.length <= 1) {
          // Only one player left (not due to fold) - award pot
          console.log('DEBUG: AI action - only one player left');
          setCurrentPlayerIndex(-1);
          setTimeout(() => {
            // Use the values we have to avoid stale closure
            const remainingPlayer = aiActivePlayers[0];
            const potToAward = updatedPot;
            handleFoldWinWithPot(remainingPlayer, potToAward, updatedPlayers);
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
      </header>

      <main className="game-container">
        {/* Main Layout */}
        <div className="main-game-layout">
          {/* Center Section: Game Info + AI Player, Cards Row, Human Player */}
          <div className="center-section">
            {/* Game Info Box - Grid Area: game-info */}
            <div className="game-info-box">
              <h3>Game Info</h3>
              <div className="game-info-static">
                <div className="info-item">
                  <span className="info-label">Round:</span>
                  <span className="info-value">{roundNumber}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phase:</span>
                  <span className="info-value">{gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Current Bet:</span>
                  <span className="info-value">${currentBet}</span>
                </div>
              </div>
            </div>

            {/* Top Row: AI Player - Grid Area: top-row */}
            <div className="top-row-container">
              <div className="ai-player-section">
                {players.filter(p => !p.isHuman).map((player, index) => {
                  const playerIndex = players.findIndex(p => p.id === player.id);
                  return (
                    <PlayerArea
                      key={player.id}
                      player={player}
                      isCurrentPlayer={playerIndex === currentPlayerIndex}
                      gamePhase={gamePhase}
                      holeCardAnimating={holeCardAnimating}
                      isActing={actingPlayerId === player.id}
                      lastAction={playerLastActions[player.id]}
                      aiCardsFlipping={aiCardsFlipping}
                    />
                  );
                })}
              </div>
            </div>

            {/* Game Log Box - Grid Area: game-log */}
            <div className="game-log-box top-row-log">
              <h3>Game Log</h3>
              <div className="log-entries">
                {gameLog.length === 0 ? (
                  <div className="log-entry">Game started. Waiting for actions...</div>
                ) : (
                  gameLog.slice().reverse().map((entry, index) => (
                    <div key={index} className="log-entry">
                      <span className="log-time">{entry.timestamp.toLocaleTimeString()}</span>
                      <span className="log-message">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cards Row: Pot, Community Cards, Deck, and Burn Cards - All Same Height */}
            <div className="cards-row-container">
              {/* Pot Display - Left of Community Cards */}
              <div className="pot-display">
                <h3>Betting Pot</h3>
                <div className="pot-amount">${pot}</div>
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

              {/* Deck Visual */}
              <div className="deck-visual">
                <h3>Deck</h3>
                <div className="deck-cards">
                  <Card card={null} />
                  <div className="deck-count">{deck.getRemainingCards()}</div>
                </div>
              </div>

              {/* Burned Cards - Fixed dimensions, always shows space for 3 cards */}
              <div className="burned-cards">
                <h3>Burn Cards</h3>
                <div className="cards-row">
                  {/* Always render 3 card slots, show actual cards or empty slots */}
                  {[0, 1, 2].map((index) => {
                    const card = burnedCards[index];
                    return (
                      <Card
                        key={`burned-${index}`}
                        card={card || null}
                        isBurned={true}
                        isBurnAnimating={burnAnimatingIndex === index}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Human Player - Grid Area: human-player */}
            <div className="human-player-section">
              {players.filter(p => p.isHuman).map((player, index) => {
                const playerIndex = players.findIndex(p => p.id === player.id);
                return (
                  <PlayerArea
                    key={player.id}
                    player={player}
                    isCurrentPlayer={playerIndex === currentPlayerIndex}
                    gamePhase={gamePhase}
                    holeCardAnimating={holeCardAnimating}
                    isActing={actingPlayerId === player.id}
                    lastAction={playerLastActions[player.id]}
                  />
                );
              })}
            </div>

            {/* Action Buttons - Grid Area: actions */}
            <div className="action-buttons-section">
              <h3>Actions</h3>
              {/* Betting Controls - Hidden during showdown, visible during betting phases */}
              {gamePhase !== 'waiting' && gamePhase !== 'showdown' && (() => {
                const humanPlayer = players.find(p => p.isHuman);
                const isPlayerTurn = players[currentPlayerIndex]?.isHuman;
                const callValidation = humanPlayer ? validateCallAction(humanPlayer, currentBet, gamePhase) : { valid: false, callAmount: 0 };
                
                // Debug logging for button state
                console.log('DEBUG: Button render - gamePhase:', gamePhase, 'currentPlayerIndex:', currentPlayerIndex, 'isPlayerTurn:', isPlayerTurn, 'handComplete:', handComplete);
                
                if (!humanPlayer) return null;
                
                return (
                  <div className={`betting-controls ${!isPlayerTurn ? 'disabled' : ''}`}>
                    <button
                      className="bet-button fold-button"
                      onClick={() => handleBettingAction('fold')}
                      disabled={!isPlayerTurn || !validateFoldAction(humanPlayer, gamePhase).valid}
                    >
                      Fold
                    </button>
                    <button
                      className="bet-button call-button"
                      onClick={() => handleBettingAction('call')}
                      disabled={!isPlayerTurn || !callValidation.valid}
                      title={!callValidation.valid ? callValidation.reason : undefined}
                    >
                      Call ${callValidation.callAmount || 0}
                    </button>
                    <div className="raise-section">
                      <input
                        type="number"
                        placeholder="Raise amount"
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(e.target.value)}
                        className="raise-input"
                        min={Math.max(1, Math.floor(currentBet * 0.5))}
                        disabled={!isPlayerTurn || (raiseAmount !== '' && !validateRaiseAction(humanPlayer, currentBet, raiseAmount, gamePhase).valid)}
                      />
                      <button
                        className="bet-button raise-button"
                        onClick={() => handleBettingAction('raise')}
                        disabled={!isPlayerTurn || !validateRaiseAction(humanPlayer, currentBet, raiseAmount, gamePhase).valid}
                        title={!validateRaiseAction(humanPlayer, currentBet, raiseAmount, gamePhase).valid ?
                          validateRaiseAction(humanPlayer, currentBet, raiseAmount, gamePhase).reason :
                          undefined}
                      >
                        Raise
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

        {/* Showdown Display */}
        {gamePhase === 'showdown' && (
          <div className="showdown-display">
            {/* Show showdown hands and community cards only if showdownData exists */}
            {showdownData && (
              <>
                <h3>Showdown Results</h3>
                <div className="showdown-hands">
                  {showdownData.hands.map((handData, index) => (
                    <div key={handData.player.id} className={`showdown-hand ${handData.player.isHuman ? 'human-hand' : 'ai-hand'} ${handData.isWinner ? 'winner' : ''}`}>
                      <div className="showdown-player-name">
                        {handData.player.name}
                        {handData.isWinner && <span className="winner-crown">👑</span>}
                      </div>
                      <div className="showdown-hand-description">
                        {handData.pokerHand.description}
                      </div>
                      <div className="showdown-cards">
                        {handData.pokerHand.cards.map((card, cardIndex) => (
                          <Card
                            key={`showdown-${handData.player.id}-${cardIndex}`}
                            card={card}
                            isHighlighted={handData.isWinner}
                            highlightColor={handData.player.isHuman ? 'green' : 'blue'}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Community Cards with Edge Highlighting */}
                <div className="showdown-community-usage">
                  <h4>Community Cards Used in Winning Hands</h4>
                  <div className="community-usage-cards">
                    {communityCards.map((card, index) => {
                      const isUsedByHuman = showdownData.hands.find(h => h.player.isHuman)?.pokerHand.cards.some(
                        handCard => handCard.rank === card.rank && handCard.suit === card.suit
                      );
                      const isUsedByAI = showdownData.hands.find(h => !h.player.isHuman)?.pokerHand.cards.some(
                        handCard => handCard.rank === card.rank && handCard.suit === card.suit
                      );

                      // Determine edge highlighting
                      let edgeHighlight: 'top' | 'bottom' | 'both' | undefined;
                      let edgeHighlightColor: 'green' | 'blue' | undefined;

                      if (isUsedByHuman && isUsedByAI) {
                        edgeHighlight = 'both';
                        edgeHighlightColor = 'green'; // Show green on bottom, blue on top
                      } else if (isUsedByHuman) {
                        edgeHighlight = 'bottom';
                        edgeHighlightColor = 'green';
                      } else if (isUsedByAI) {
                        edgeHighlight = 'top';
                        edgeHighlightColor = 'blue';
                      }

                      return (
                        <div key={`usage-${index}`} className="community-card-usage">
                          <Card
                            card={card}
                            edgeHighlight={edgeHighlight}
                            edgeHighlightColor={edgeHighlightColor}
                          />
                          <div className="usage-indicators">
                            {isUsedByHuman && <div className="usage-human">Human</div>}
                            {isUsedByAI && <div className="usage-ai">AI</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Enhanced Winner Announcement with Color-Coded Hand Comparison */}
            {winner && (
              <div className={`winner-announcement ${winner.isHuman ? 'human-winner' : 'ai-winner'}`}>
                <h2 className="round-winner-title">
                  🏆 Round Winner: {winner.name} 🏆
                </h2>
                {showdownData ? (
                  <>
                    <h3 className="pot-won-amount">
                      Wins ${showdownData.potAmount}!
                    </h3>
                    {showdownData.hands.length > 1 && (
                      <div className="hand-comparison">
                        <div className="comparison-header">Hand Comparison:</div>
                        {(() => {
                          const winnerHand = showdownData.hands.find(h => h.isWinner);
                          const loserHand = showdownData.hands.find(h => !h.isWinner);

                          if (winnerHand && loserHand) {
                            return (
                              <div className="comparison-content">
                                <div className={`hand-result winning-hand ${winnerHand.player.isHuman ? 'human-text' : 'ai-text'}`}>
                                  <div className="hand-player-name">{winnerHand.player.name}:</div>
                                  <div className="hand-type">{winnerHand.pokerHand.description}</div>
                                </div>
                                <div className="vs-divider">
                                  <span className="vs-text">BEATS</span>
                                </div>
                                <div className={`hand-result losing-hand ${loserHand.player.isHuman ? 'human-text' : 'ai-text'}`}>
                                  <div className="hand-player-name">{loserHand.player.name}:</div>
                                  <div className="hand-type">{loserHand.pokerHand.description}</div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <h3 className="pot-won-amount">
                    Wins ${lastPotWon} - Opponent folded
                  </h3>
                )}
                {/* Next Round Button */}
                {(() => {
                  // Debug logging for Next Round button visibility
                  if (gamePhase === 'showdown') {
                    console.log('DEBUG: Next Round button check - handComplete:', handComplete, 'gameOver:', gameOver, 'winner:', winner?.name || 'null');
                  }
                  return handComplete && !gameOver && (
                    <button
                      onClick={() => {
                        console.log('DEBUG: Next Round button clicked, handComplete:', handComplete, 'gameOver:', gameOver, 'gamePhase:', gamePhase);
                        startNextRound();
                      }}
                      className="deal-button next-round-button"
                    >
                      Next Round
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        )}

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
                    {aiActionDisplay.amount !== undefined && aiActionDisplay.amount > 0 && (
                      <span className="action-amount"> ${aiActionDisplay.amount}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      </main>
    </div>
  );
}

export default App;
