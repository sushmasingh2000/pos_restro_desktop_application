const getLast12Months = () => {
    const months = [];
    const date = new Date();

    for (let i = 0; i < 12; i++) {
        const d = new Date(date.getFullYear(), date.getMonth() - i, 1);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");

        const label = d.toLocaleString("default", { month: "long" });

        months.push({
            value: `${year}-${month}`,
            label: `${label} ${year}`,
        });
    }

    return months;
};

export default getLast12Months;