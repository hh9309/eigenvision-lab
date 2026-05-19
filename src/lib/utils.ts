import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Matrix Math Utilities
 */
import * as math from 'mathjs';

export interface EigenResult {
  eigenvalues: number[];
  eigenvectors: number[][]; // Each inner array is an eigenvector
}

export function computeEigen(matrix: number[][]): EigenResult | null {
  try {
    const m = math.matrix(matrix);
    const ans = math.eigs(m) as any;
    
    // math.eigs returns eigenvalues and eigenvectors
    // Use the modern properties first, with fallback to legacy ones
    const eigenValuesRaw = ans.eigenvalues || ans.values;
    const eigenVectorsRaw = ans.eigenvectors || ans.vectors;

    if (!eigenValuesRaw || !eigenVectorsRaw) {
      throw new Error("Missing expected properties from math.eigs result");
    }
    
    // Determine the values
    const values = (typeof eigenValuesRaw.toArray === 'function' ? eigenValuesRaw.toArray() : Array.from(eigenValuesRaw))
      .map((v: any) => typeof v === 'number' ? v : (v && typeof v.re === 'number' ? v.re : v));

    let eigenvectors: number[][] = [];

    // Check if eigenVectorsRaw is an array of { value, vector } objects
    if (Array.isArray(eigenVectorsRaw) && eigenVectorsRaw.length > 0 && eigenVectorsRaw[0].vector) {
      eigenvectors = eigenVectorsRaw.map((item: any) => {
        const v = item.vector;
        const arr = (typeof v.toArray === 'function' ? v.toArray() : v) as any[];
        return arr.map((val: any) => typeof val === 'number' ? val : (val && typeof val.re === 'number' ? val.re : val));
      });
    } else {
      // It's a matrix where columns are eigenvectors
      const vectorsArr = (typeof eigenVectorsRaw.toArray === 'function' ? eigenVectorsRaw.toArray() : eigenVectorsRaw) as any[][];
      
      // Transpose so each sub-array is an eigenvector (mathjs vectors are typically columns in matrix results)
      for (let j = 0; j < vectorsArr[0].length; j++) {
        const vec = [];
        for (let i = 0; i < vectorsArr.length; i++) {
          const val = vectorsArr[i][j];
          vec.push(typeof val === 'number' ? val : (val && typeof val.re === 'number' ? val.re : val));
        }
        eigenvectors.push(vec);
      }
    }

    return { eigenvalues: values, eigenvectors };
  } catch (e) {
    console.error("Eigen computation error:", e);
    return null;
  }
}

/**
 * Apply a matrix transformation to a vector
 */
export function transformVector(matrix: number[][], vector: number[]): number[] {
  const result = [];
  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < (matrix[i]?.length || 0); j++) {
      sum += (matrix[i][j] || 0) * (vector[j] || 0);
    }
    result.push(sum);
  }
  return result;
}
