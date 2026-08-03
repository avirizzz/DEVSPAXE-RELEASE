/**
 * Algorithm Simulator Engine
 * Generates step-by-step snapshots for various algorithms.
 */

// ==========================================
// SORTING
// ==========================================
export function simulateSorting(items, algo = 'bubble') {
  const snapshots = [];
  const arr = [...items];
  
  const pushSnapshot = (comparing = [], sorted = [], pivot = -1) => {
    snapshots.push({
      items: [...arr],
      comparing,
      sorted,
      pivot,
      title: 'Sorting Step'
    });
  };

  if (algo === 'bubble') {
    let n = arr.length;
    let sortedIndices = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        pushSnapshot([j, j + 1], [...sortedIndices]);
        if (arr[j] > arr[j + 1]) {
          let temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          pushSnapshot([j, j + 1], [...sortedIndices]); // After swap
        }
      }
      sortedIndices.push(n - i - 1);
      pushSnapshot([], [...sortedIndices]);
    }
    sortedIndices.push(0);
    pushSnapshot([], [...sortedIndices]); // All sorted
  } else if (algo === 'selection') {
    let n = arr.length;
    let sortedIndices = [];
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        pushSnapshot([minIdx, j], [...sortedIndices]);
        if (arr[j] < arr[minIdx]) {
          minIdx = j;
          pushSnapshot([minIdx, j], [...sortedIndices]);
        }
      }
      if (minIdx !== i) {
        let temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
        pushSnapshot([i, minIdx], [...sortedIndices]);
      }
      sortedIndices.push(i);
      pushSnapshot([], [...sortedIndices]);
    }
    sortedIndices.push(n - 1);
    pushSnapshot([], [...sortedIndices]);
  } else if (algo === 'insertion') {
    let n = arr.length;
    let sortedIndices = [0];
    pushSnapshot([], [...sortedIndices]);
    for (let i = 1; i < n; i++) {
      let key = arr[i];
      let j = i - 1;
      pushSnapshot([i, j], [...sortedIndices]);
      while (j >= 0 && arr[j] > key) {
        arr[j + 1] = arr[j];
        pushSnapshot([j, j + 1], [...sortedIndices]);
        j = j - 1;
      }
      arr[j + 1] = key;
      sortedIndices.push(i);
      pushSnapshot([], [...sortedIndices]);
    }
  } else if (algo === 'quick') {
    const quickSort = (low, high) => {
      if (low < high) {
        // Partition
        let pivotVal = arr[high];
        pushSnapshot([], [], high); // Show pivot
        let i = low - 1;
        for (let j = low; j <= high - 1; j++) {
          pushSnapshot([j, high], [], high);
          if (arr[j] < pivotVal) {
            i++;
            let temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            pushSnapshot([i, j], [], high);
          }
        }
        let temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        let pi = i + 1;
        pushSnapshot([pi, high], [], pi);
        
        quickSort(low, pi - 1);
        quickSort(pi + 1, high);
      }
    };
    quickSort(0, arr.length - 1);
    const allSorted = arr.map((_, i) => i);
    pushSnapshot([], allSorted, -1);
  }

  return snapshots;
}

// ==========================================
// BINARY SEARCH
// ==========================================
export function simulateBinarySearch(items, target) {
  const snapshots = [];
  let left = 0;
  let right = items.length - 1;
  
  const pushSnapshot = (l, r, m) => {
    snapshots.push({
      items: [...items],
      left: l,
      right: r,
      mid: m,
      title: `Search space: [${l}, ${r}]`
    });
  };

  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    pushSnapshot(left, right, mid);
    
    if (items[mid] === target) {
      // Found
      snapshots.push({
        items: [...items], left: mid, right: mid, mid: mid, title: `Found at index ${mid}!`
      });
      break;
    } else if (items[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (left > right) {
    snapshots.push({
      items: [...items], left, right, mid: -1, title: 'Not found'
    });
  }

  return snapshots;
}

// ==========================================
// TREE TRAVERSAL (DFS / BFS)
// ==========================================
// Assumes items is an array representing a binary tree (like Heap)
export function simulateTreeTraversal(items, algo = 'dfs') {
  const snapshots = [];
  
  const pushSnapshot = (currentNode, visited = []) => {
    snapshots.push({
      nodes: [...items],
      currentNode,
      visited: [...visited],
      title: `${algo.toUpperCase()} Step`
    });
  };

  const visited = [];
  
  if (algo === 'dfs') {
    // Recursive DFS simulation
    const dfs = (idx) => {
      if (idx >= items.length || items[idx] === '' || items[idx] === null) return;
      pushSnapshot(idx, visited);
      visited.push(idx);
      pushSnapshot(idx, visited); // Show marked as visited
      
      dfs(2 * idx + 1); // Left child
      dfs(2 * idx + 2); // Right child
    };
    dfs(0);
  } else if (algo === 'bfs') {
    const queue = [0];
    while (queue.length > 0) {
      const idx = queue.shift();
      if (idx >= items.length || items[idx] === '' || items[idx] === null) continue;
      
      pushSnapshot(idx, visited);
      visited.push(idx);
      pushSnapshot(idx, visited); // Marked as visited
      
      if (2 * idx + 1 < items.length && items[2 * idx + 1] !== '') queue.push(2 * idx + 1);
      if (2 * idx + 2 < items.length && items[2 * idx + 2] !== '') queue.push(2 * idx + 2);
    }
  }

  return snapshots;
}
