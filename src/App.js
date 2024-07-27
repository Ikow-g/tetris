import React, { useRef, useEffect, useState, useCallback } from "react";
import "./App.css";

const App = () => {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);

  const createMatrix = (w, h) => {
    const matrix = [];
    while (h--) {
      matrix.push(new Array(w).fill(0));
    }
    return matrix;
  };

  const [arena, setArena] = useState(createMatrix(12, 20));
  const [player, setPlayer] = useState({
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
  });

  const collide = useCallback((arena, player) => {
    const { matrix, pos } = player;
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < matrix[y].length; ++x) {
        if (
          matrix[y][x] !== 0 &&
          (arena[y + pos.y] && arena[y + pos.y][x + pos.x]) !== 0
        ) {
          return true;
        }
      }
    }
    return false;
  }, []);

  const updateScore = useCallback(() => {
    document.getElementById("score").innerText = "Score: " + player.score;
  }, [player]);

  const playerReset = useCallback(() => {
    const pieces = "TJLOSZI";
    setPlayer((prevPlayer) => {
      const newMatrix = createPiece(
        pieces[(pieces.length * Math.random()) | 0]
      );
      const updatedPlayer = {
        ...prevPlayer,
        matrix: newMatrix,
        pos: {
          x: ((arena[0].length / 2) | 0) - ((newMatrix[0].length / 2) | 0),
          y: 0,
        },
      };
      if (collide(arena, updatedPlayer)) {
        setArena(createMatrix(12, 20));
        updatedPlayer.score = 0;
        updateScore();
      }
      return updatedPlayer;
    });
  }, [arena, collide, updateScore]);

  

  const arenaSweep = useCallback(() => {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
      for (let x = 0; x < arena[y].length; ++x) {
        if (arena[y][x] === 0) {
          continue outer;
        }
      }

      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      ++y;
      player.score += rowCount * 10;
      rowCount *= 2;
    }
  }, [arena, player]);

  const createPiece = (type) => {
    switch (type) {
      case "I":
        return [
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
        ];
      case "L":
        return [
          [0, 2, 0],
          [0, 2, 0],
          [0, 2, 2],
        ];
      case "J":
        return [
          [0, 3, 0],
          [0, 3, 0],
          [3, 3, 0],
        ];
      case "O":
        return [
          [4, 4],
          [4, 4],
        ];
      case "Z":
        return [
          [5, 5, 0],
          [0, 5, 5],
          [0, 0, 0],
        ];
      case "S":
        return [
          [0, 6, 6],
          [6, 6, 0],
          [0, 0, 0],
        ];
      case "T":
        return [
          [7, 7, 7],
          [0, 7, 0],
          [0, 0, 0],
        ];
      default:
        return [];
    }
  };

  const drawMatrix = useCallback(
    (matrix, offset) => {
      if (!matrix) return;
      matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            context.fillStyle = colors[value];
            context.fillRect(x + offset.x, y + offset.y, 1, 1);
          }
        });
      });
    },
    [context]
  );

  const draw = useCallback(() => {
    if (!context) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
  }, [context, arena, player, drawMatrix]);

  const merge = useCallback((arena, player) => {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          arena[y + player.pos.y][x + player.pos.x] = value;
        }
      });
    });
  }, []);

  const rotate = (matrix, dir) => {
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if (dir > 0) {
      matrix.forEach((row) => row.reverse());
    } else {
      matrix.reverse();
    }
  };

  const playerDrop = useCallback(() => {
    setPlayer((prevPlayer) => {
      const updatedPlayer = {
        ...prevPlayer,
        pos: { ...prevPlayer.pos, y: prevPlayer.pos.y + 1 },
      };
      if (collide(arena, updatedPlayer)) {
        updatedPlayer.pos.y--;
        merge(arena, updatedPlayer);
        playerReset();
        arenaSweep();
        updateScore();
      }
      return updatedPlayer;
    });
    dropCounter = 0;
  }, [arena, collide, merge, playerReset, arenaSweep, updateScore]);

  const playerMove = useCallback(
    (offset) => {
      setPlayer((prevPlayer) => {
        const updatedPlayer = {
          ...prevPlayer,
          pos: { ...prevPlayer.pos, x: prevPlayer.pos.x + offset },
        };
        if (collide(arena, updatedPlayer)) {
          updatedPlayer.pos.x -= offset;
        }
        return updatedPlayer;
      });
    },
    [arena, collide]
  );

  const playerRotate = useCallback(
    (dir) => {
      const pos = player.pos.x;
      let offset = 1;
      setPlayer((prevPlayer) => {
        const updatedPlayer = { ...prevPlayer };
        rotate(updatedPlayer.matrix, dir);
        while (collide(arena, updatedPlayer)) {
          updatedPlayer.pos.x += offset;
          offset = -(offset + (offset > 0 ? 1 : -1));
          if (offset > updatedPlayer.matrix[0].length) {
            rotate(updatedPlayer.matrix, -dir);
            updatedPlayer.pos.x = pos;
            return prevPlayer;
          }
        }
        return updatedPlayer;
      });
    },
    [arena, collide]
  );

  const update = useCallback(
    (time = 0) => {
      const deltaTime = time - lastTime;
      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        playerDrop();
      }
      lastTime = time;
      draw();
      requestAnimationFrame(update);
    },
    [playerDrop, draw]
  );

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context.scale(20, 20);
      setContext(context);
      playerReset();
      updateScore();
      update();
    }
  }, [playerReset, updateScore, update]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.keyCode === 37) {
        playerMove(-1);
      } else if (event.keyCode === 39) {
        playerMove(1);
      } else if (event.keyCode === 40) {
        playerDrop();
      } else if (event.keyCode === 81) {
        playerRotate(-1);
      } else if (event.keyCode === 87) {
        playerRotate(1);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [playerMove, playerDrop, playerRotate]);

  const colors = [
    null,
    "#ff0d72",
    "#0dc2ff",
    "#0dff72",
    "#f538ff",
    "#ff8e0d",
    "#ffe138",
    "#3877ff",
  ];

  return (
    <div className="App">
      <div id="score"></div>
      <canvas ref={canvasRef} id="tetris" width={240} height={400}></canvas>
    </div>
  );
};

export default App;
