import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import axios from "axios";
import InboxPlacementTest from "./InboxPlacementTest.js"; 
import PreviousResults from "./PreviousResults"; 

const App = () => {
  return (
    <Router>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>Email Inbox Placement Tester</h1>
  
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/" style={{ marginRight: "10px", textDecoration: "none", color: "blue" }}>
            Inbox Placement Test
          </Link>
          <Link to="/previous-results" style={{ textDecoration: "none", color: "blue" }}>
            Previous Results
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<InboxPlacementTest />} />
          <Route path="/previous-results" element={<PreviousResults />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
