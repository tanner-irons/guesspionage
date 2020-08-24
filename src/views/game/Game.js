import './Game.scss';

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useWebSocket } from '../../hooks/UseWebSocket';
import { useTimer } from './../../hooks/UseTimer';
import { updatePlayer, updatePlayers, setTarget, incrementTurn, setTimeLeft } from './../../store/game/GameActions';
import { isPlayerCurrent } from './../../store/game/GameSelectors';
import { incrementQuestion } from './../../store/question/QuestionActions';
import { getCurrentQuestion } from './../../store/question/QuestionSelectors';
import { getSessionPlayer } from './../../store/session/SessionSelectors';
import Question from './../../components/question/Question';
import Meter from './../../components/meter/Meter';
import Score from './../../components/score/Score';
import Vote from '../../components/vote/Vote';
import Timer from './../../components/timer/Timer';
import { throttle } from 'lodash';
import { Guesses } from './../../models/Guesses';

const Game = () => {
    const dispatch = useDispatch();
    const emitAction = useWebSocket();

    const { id, guess } = useSelector(getSessionPlayer);
    const playerIsCurrent = useSelector(isPlayerCurrent(id));
    const playerHasGuessed = guess !== Guesses.None;

    const { players, target, timeLeft } = useSelector(state => state.game);

    const { prompt, percentage } = useSelector(getCurrentQuestion);

    const { timeLimit } = useSelector(state => state.settings);

    const updateTarget = useCallback(
        throttle(guess => {
            if (playerIsCurrent && !playerHasGuessed && guess >= 0 && guess <= 100) {
                emitAction(setTarget(guess));
            }
        }, 150, { leading: true, trailing: false }),
        [emitAction, playerHasGuessed, playerIsCurrent]
    );

    const updatePlayerGuess = useCallback(
        guess => !playerIsCurrent && !playerHasGuessed && emitAction(updatePlayer(id, { guess })),
        [emitAction, id, playerHasGuessed, playerIsCurrent]
    );

    const scoreQuestion = useCallback(
        () => {
            const update = Object.entries(players).reduce((players, [key, player]) => {
                const score = calculateScore(player, target, percentage)
                players[key] = { ...player, score, guess: Guesses.None };
                return players;
            }, {});

            emitAction(updatePlayers(update));
            emitAction(incrementQuestion());
            emitAction(incrementTurn());
            emitAction(setTarget(50));
        },
        [emitAction, players, target, percentage]
    );

    const onTick = useCallback(
        seconds => emitAction(setTimeLeft(seconds)),
        [emitAction]
    );

    const startTimer = useTimer(timeLimit, onTick, scoreQuestion);

    const confirm = useCallback(
        () => {
            dispatch(updatePlayer(id, { guess: Guesses.Target }));
            startTimer();
        },
        [dispatch, startTimer, id]
    );

    return (
        <div className="game">
            <div className="section section-game">
                <div className={`sub-section sub-section-question${playerIsCurrent ? " no-response" : ""}`}>
                    <Question prompt={prompt}></Question>
                    <Meter readOnly={!playerIsCurrent || playerHasGuessed} value={target} handleChange={updateTarget} handleConfirm={confirm}></Meter>
                    <Timer seconds={timeLeft}></Timer>
                </div>
                {!playerIsCurrent &&
                    <div className="sub-section sub-section-vote">
                        <Vote readOnly={playerHasGuessed} guess={guess} handleChange={updatePlayerGuess}></Vote>
                    </div>
                }
            </div>
            <div className="section section-score">
                <Score players={players}></Score>
            </div>
        </div>
    );
};

const calculateScore = (player, target, percentage) => {
    switch (true) {
        case player.guess === Guesses.Target && target === Number(percentage):
            return player.score + 2500;
        case player.guess === Guesses.Target && target >= (percentage - 5) && target <= (percentage + 5):
            return player.score + 1500;
        case player.guess === Guesses.Target && target >= (percentage - 10) && target <= (percentage + 10):
            return player.score + 1000;
        case player.guess === Guesses.Target && target >= (percentage - 15) && target <= (percentage + 15):
            return player.score + 500;
        case player.guess === Guesses.Lower && percentage < target:
            return player.score + 500;
        case player.guess === Guesses.MuchLower && percentage < target - 15:
            return player.score + 1000;
        case player.guess === Guesses.Higher && percentage > target:
            return player.score + 500;
        case player.guess === Guesses.MuchHigher && percentage > target + 15:
            return player.score + 1000;
        default:
            return player.score;
    }
};

export default Game;