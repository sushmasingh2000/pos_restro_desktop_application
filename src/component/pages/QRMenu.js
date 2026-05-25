import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const QrMenuPage = () => {

  const { token } = useParams();

  const [table, setTable] = useState(null);

  useEffect(() => {

    fetchTable();

  }, []);

  useEffect(() => {
  console.log("QR PAGE OPENED");
}, []);

  const fetchTable = async () => {

    try {

      const res = await axios.get(
        `http://192.168.18.101:9047/api/v1/public/table/${token}`
      );

      setTable(res.data.result);

    } catch (err) {

      alert("Invalid QR");

    }
  };

  if (!table) {
    return <div>Loading...</div>;
  }

  return (

    <div style={{ padding: 20 }}>

      <h1>
        Welcome {table.dg05_table_name}
      </h1>

      <h3>Menu</h3>

      <div>

        <button>Burger ₹75</button>

        <button>Coffee ₹57</button>

      </div>

    </div>
  );
};

export default QrMenuPage;