import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Skull, RotateCcw, Home, Target, Zap } from 'lucide-react';
import * as d3 from 'd3';
import { GameMode } from '../types';

interface GameOverModalProps {
  isVictory: boolean;
  score: number;
  kills: number;
  deaths: number;
  mode: GameMode;
  wave?: number;
  mvpName?: string;
  mvpKills?: number;
  onRestart: () => void;
  onQuit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  score,
  kills,
  deaths,
  mode,
  wave,
  mvpName,
  mvpKills,
  onRestart,
  onQuit,
}) => {
  const kdRatio = deaths === 0 ? kills.toFixed(1) : (kills / deaths).toFixed(2);
  const svgRef = useRef<SVGSVGElement>(null);
  const [history, setHistory] = useState<number[]>([]);

  // Update history in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mini_militia_history');
      let currentHistory: number[] = stored ? JSON.parse(stored) : [];
      currentHistory.push(kills);
      // Keep only last 5 games
      if (currentHistory.length > 5) {
        currentHistory = currentHistory.slice(currentHistory.length - 5);
      }
      localStorage.setItem('mini_militia_history', JSON.stringify(currentHistory));
      setHistory(currentHistory);
    } catch (e) {
      console.error("Failed to load/save history", e);
    }
  }, [kills]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || history.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 300;
    const height = 100;
    const margin = { top: 10, right: 10, bottom: 20, left: 25 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, Math.max(1, history.length - 1)])
      .range([0, innerWidth]);

    const maxKills = Math.max(...history, 5);
    const y = d3.scaleLinear()
      .domain([0, maxKills])
      .range([innerHeight, 0]);

    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(history.length).tickFormat(d => `#${Number(d) + 1}`))
      .attr("color", "#737373")
      .selectAll("text")
      .attr("font-size", "9px")
      .attr("font-family", "sans-serif");

    g.append("g")
      .call(d3.axisLeft(y).ticks(3).tickFormat(d3.format("d")))
      .attr("color", "#737373")
      .selectAll("text")
      .attr("font-size", "9px")
      .attr("font-family", "sans-serif");

    // Grid lines (horizontal)
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .ticks(3)
        .tickSize(-innerWidth)
        .tickFormat(() => "")
      )
      .attr("color", "#262626")
      .attr("stroke-dasharray", "2,2");

    // Line
    g.append("path")
      .datum(history)
      .attr("fill", "none")
      .attr("stroke", "#38bdf8") // Sky blue
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Points
    g.selectAll("circle")
      .data(history)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => x(i))
      .attr("cy", (d: number) => y(d))
      .attr("r", 4)
      .attr("fill", "#0284c7")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);
      
  }, [history]);

  return (
    <div id="game-over-modal" className="absolute inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-neutral-900 border-2 border-neutral-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Banner Icon */}
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-3 shadow-xl ${
          isVictory
            ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-400/60 shadow-amber-500/20'
            : 'bg-rose-500/20 text-rose-500 border-2 border-rose-500/60 shadow-rose-500/20'
        }`}>
          {isVictory ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black tracking-tight text-white mb-1">
          {isVictory ? 'انتصار ساحق! 🏆' : 'انتهت المعركة! 💀'}
        </h2>
        <p className="text-xs text-neutral-400 mb-6">
          {mode === 'survival'
            ? `صمدت حتى الموجة ${wave || 1}`
            : (isVictory ? 'أداء عسكري بطولي في الساحة' : 'حظاً أوفر في الجولة القادمة')}
        </p>

        {/* Match Statistics Card */}
        <div className="w-full grid grid-cols-3 gap-2 bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 mb-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-400 mb-0.5">القتلى</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{kills}</span>
          </div>

          <div className="flex flex-col items-center border-x border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 mb-0.5">الوفيات</span>
            <span className="text-xl font-black text-rose-400 font-mono">{deaths}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-400 mb-0.5">معدل K/D</span>
            <span className="text-xl font-black text-amber-400 font-mono">{kdRatio}</span>
          </div>
        </div>

        {/* Match MVP Highlight Card */}
        {mvpName && (
          <div className="w-full bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-orange-500/10 border border-amber-500/40 rounded-2xl p-3 mb-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-400/90 block">أسطورة المعركة (Match MVP)</span>
                <span className="text-sm font-black text-white">{mvpName}</span>
              </div>
            </div>
            <div className="text-left font-mono font-black text-amber-400 text-sm">
              {mvpKills} قتلى 🏆
            </div>
          </div>
        )}

        {/* D3 Chart: Kills Trend */}
        <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3 mb-6 flex flex-col items-center">
          <span className="text-[10px] font-bold text-neutral-400 mb-1 w-full text-right">أداء آخر 5 جولات (القتلى)</span>
          <svg ref={svgRef} width="300" height="100" className="opacity-90"></svg>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            id="btn-play-again"
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            <span>معركة جديدة (Play Again)</span>
          </button>

          <button
            id="btn-game-over-quit"
            onClick={onQuit}
            className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-750 active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>القائمة الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
