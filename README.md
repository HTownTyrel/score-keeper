# Score Keeper

A simple browser app for keeping a running score across game night, for any
number of players and different kinds of games.

## What it does so far

- Set up a new game with any number of players.
- **Golf (tally mode):** tap a player's card each time they win a hand; it
  keeps a running count per player.
- **Undo:** removes the most recent point if you tap the wrong player.
- Your game auto-saves to the browser (`localStorage`), so refreshing or
  closing the tab won't lose your progress.
- **Game History:** ending a game saves it to a history list, showing the
  final score and marking the winner (🏆). History can be cleared too.

## How to run it

Just open `index.html` in a web browser. There's no build step or server -
it's plain HTML, CSS, and JavaScript.

## Planned next steps

- Add a second, numeric scoring mode for games that need entered point totals
  instead of simple taps (e.g. Rummy).
