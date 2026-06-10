import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const BLUE = {
  900: "#042C53", 800: "#0C447C", 700: "#185FA5", 600: "#185FA5",
  500: "#378ADD", 400: "#378ADD", 300: "#85B7EB", 200: "#B5D4F4",
  100: "#E6F1FB", 50: "#F0F7FF",
};

const WEEK_DATA = [
  { day: "Mon", restaurant: 42, online: 18 },
  { day: "Tue", restaurant: 55, online: 27 },
  { day: "Wed", restaurant: 38, online: 21 },
  { day: "Thu", restaurant: 67, online: 34 },
  { day: "Fri", restaurant: 91, online: 48 },
  { day: "Sat", restaurant: 83, online: 52 },
  { day: "Sun", restaurant: 60, online: 31 },
];

const MONTH_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  restaurant: Math.round(30 + Math.random() * 70),
  online: Math.round(10 + Math.random() * 40),
}));

const TODAY_DATA = [
  { hour: "9am",  restaurant: 4,  online: 1 },
  { hour: "10am", restaurant: 7,  online: 3 },
  { hour: "11am", restaurant: 12, online: 5 },
  { hour: "12pm", restaurant: 22, online: 11 },
  { hour: "1pm",  restaurant: 18, online: 9 },
  { hour: "2pm",  restaurant: 10, online: 4 },
  { hour: "3pm",  restaurant: 6,  online: 3 },
  { hour: "4pm",  restaurant: 8,  online: 5 },
  { hour: "5pm",  restaurant: 14, online: 7 },
  { hour: "6pm",  restaurant: 20, online: 10 },
  { hour: "7pm",  restaurant: 25, online: 13 },
  { hour: "8pm",  restaurant: 16, online: 8 },
];

const RANGES = ["Today", "This week", "This month"];
const CHART_TYPES = ["Bar", "Line"];



const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${BLUE[200]}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(24,95,165,.12)",
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, color: BLUE[800], marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: p.color }} />
          <span style={{ color: "#64748b" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: BLUE[900] }}>{p.value}</span>
        </div>
      ))}
      <div style={{
        borderTop: `1px solid ${BLUE[100]}`, marginTop: 6, paddingTop: 6,
        display: "flex", justifyContent: "space-between", color: BLUE[700], fontWeight: 600,
      }}>
        <span>Total</span>
        <span>{payload.reduce((s, p) => s + p.value, 0)}</span>
      </div>
    </div>
  );
};

export default function DailyOrdersChart() {
  const [range, setRange] = useState("This week");
  const [chartType, setChartType] = useState("Bar");
  const [fromDate, setFromDate] = useState("2026-06-04");
  const [toDate, setToDate] = useState("2026-06-04");

  const data = range === "Today" ? TODAY_DATA
    : range === "This month" ? MONTH_DATA
    : WEEK_DATA;

  const xKey = range === "Today" ? "hour" : "day";

  const totals = useMemo(() => ({
    total: data.reduce((s, d) => s + d.restaurant + d.online, 0),
    restaurant: data.reduce((s, d) => s + d.restaurant, 0),
    online: data.reduce((s, d) => s + d.online, 0),
    peak: data.reduce((a, b) => (a.restaurant + a.online > b.restaurant + b.online ? a : b)),
  }), [data]);

  const barRadius = range === "This month" ? [2, 2, 0, 0] : [5, 5, 0, 0];

  return (
    <div>

     


      {/* Chart Card */}
      <div >

        {/* Card Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 22px 14px", borderBottom: `1px solid ${BLUE[100]}`,
          flexWrap: "wrap", gap: 10,
        }}>
          
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Range pills */}
            <div style={{ display: "flex", background: BLUE[50], borderRadius: 20, padding: 3, gap: 2 }}>
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  fontSize: 12, fontWeight: range === r ? 600 : 400,
                  padding: "5px 12px", borderRadius: 17,
                  background: range === r ? BLUE[700] : "transparent",
                  color: range === r ? "#fff" : "#64748b",
                  border: "none", cursor: "pointer", transition: "all .15s",
                  fontFamily: "inherit",
                }}>{r}</button>
              ))}
            </div>
            {/* Chart type toggle */}
            <div style={{ display: "flex", background: BLUE[50], borderRadius: 20, padding: 3, gap: 2 }}>
              {CHART_TYPES.map(t => (
                <button key={t} onClick={() => setChartType(t)} style={{
                  fontSize: 12, fontWeight: chartType === t ? 600 : 400,
                  padding: "5px 12px", borderRadius: 17,
                  background: chartType === t ? BLUE[500] : "transparent",
                  color: chartType === t ? "#fff" : "#64748b",
                  border: "none", cursor: "pointer", transition: "all .15s",
                  fontFamily: "inherit",
                }}>{t}</button>
              ))}
            </div>
            {/* View Report */}
           
          </div>
        </div>

        {/* Custom Legend */}
        <div style={{ display: "flex", gap: 18, padding: "12px 22px 0", fontSize: 12, color: "#64748b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: BLUE[700], display: "inline-block" }} />
            Restaurant Orders
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: BLUE[300], display: "inline-block" }} />
            Online Orders
          </span>
        </div>

        {/* Chart */}
        <div style={{ padding: "12px 22px 20px" }}>
          <ResponsiveContainer width="100%" height={260}>
            {chartType === "Bar" ? (
              <BarChart data={data} barGap={3} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#E2EDFF" strokeDasharray="3 0" />
                <XAxis dataKey={xKey} axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "inherit" }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "inherit" }}
                  width={32} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#EFF6FF", radius: 4 }} />
                <Bar dataKey="restaurant" name="Restaurant Orders" fill={BLUE[700]}
                  radius={barRadius} maxBarSize={range === "This month" ? 16 : 32} />
                <Bar dataKey="online" name="Online Orders" fill={BLUE[300]}
                  radius={barRadius} maxBarSize={range === "This month" ? 16 : 32} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid vertical={false} stroke="#E2EDFF" strokeDasharray="3 0" />
                <XAxis dataKey={xKey} axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "inherit" }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b", fontFamily: "inherit" }}
                  width={32} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="restaurant" name="Restaurant Orders"
                  stroke={BLUE[700]} strokeWidth={2.5} dot={{ r: 3, fill: BLUE[700] }}
                  activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="online" name="Online Orders"
                  stroke={BLUE[300]} strokeWidth={2.5} dot={{ r: 3, fill: BLUE[300] }}
                  strokeDasharray="5 3" activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        
      </div>
    </div>
  );
}