# Score Keeper

A simple browser app for keeping a running score across game night, for any
number of players and different kinds of games.

## What it does so far

- Set up a new game with any number of players.
- **Tally mode** (e.g. Golf, 99): tap a player's card each time they win a
  hand; it keeps a running count per player.
- **Numeric mode**: type in a point amount (positive or negative) per player
  each round, for games with real point totals instead of simple taps.
- **Undo:** removes the most recent point/entry if you tap the wrong player
  or mistype an amount.
- Your game auto-saves to the browser (`localStorage`), so refreshing or
  closing the tab won't lose your progress.
- **Game History:** ending a game saves it to a history list, showing the
  final score and marking the winner (🏆). History can be cleared too.
- **Manage Games:** add your own custom games (name, tally-or-numeric, and
  whether most or fewest points wins) right from the app - no code editing
  needed. Built-in games (Golf, 99) can't be deleted; custom ones can.

## How to run it

Just open `index.html` in a web browser. There's no build step or server -
it's plain HTML, CSS, and JavaScript.
