import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { POLL_COLORS } from '@/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PollChartProps {
  options: { id: number; keyword: string; text: string; vote_count: number }[];
  totalVotes: number;
  chartType?: 'bar' | 'doughnut';
  correctKeyword?: string | null;
}

export default function PollChart({
  options,
  totalVotes,
  chartType = 'bar',
  correctKeyword
}: PollChartProps) {
  const labels = options.map(o => `${o.keyword}: ${o.text}`);
  const dataValues = options.map(o => o.vote_count);
  const backgroundColors = options.map((o, i) => {
    if (correctKeyword && o.keyword.toUpperCase() === correctKeyword.toUpperCase()) {
      return '#10b981'; // Emerald for correct answer
    }
    return POLL_COLORS[i % POLL_COLORS.length];
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Votes',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderRadius: chartType === 'bar' ? 6 : 0,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = totalVotes > 0 ? ((val / totalVotes) * 100).toFixed(1) : 0;
            return `Votes: ${val} (${pct}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, precision: 0 },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = totalVotes > 0 ? ((val / totalVotes) * 100).toFixed(1) : 0;
            return `${context.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="h-56 w-full relative">
      {chartType === 'bar' ? (
        <Bar data={chartData} options={barOptions} />
      ) : (
        <Doughnut data={chartData} options={doughnutOptions} />
      )}
    </div>
  );
}
