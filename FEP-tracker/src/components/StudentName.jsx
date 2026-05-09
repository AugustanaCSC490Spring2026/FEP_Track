import { useState,useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { database } from "../firebase-config" ;
export default function StudentName({ studentId }) {
    const [name, setName] = useState("Loading...");
  
    useEffect(() => {
      const fetchName = async () => {
        if (!studentId) return;

        try {
          const docRef = doc(database, "users", studentId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setName(docSnap.data().name || "Unknown Student");
          } else {
            setName("Not Found");
          }
        } catch (e) {
          // This is the "catch" clause the error was looking for!
          console.error("Error fetching student name:", e);
          setName("Error");
        }
      };

      fetchName();
    }, [studentId]);

    return <>{name}</>;
  };