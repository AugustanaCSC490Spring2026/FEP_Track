export  function timeFormat(time) {
    let hours = 0;
    let ampm = "";
    let minutes = 0;

    if (time) {
      const date = new Date(`1970-01-01T${time}:00`);
      hours = date.getHours();
      minutes = date.getMinutes();
      ampm = hours >= 12 ? "PM" : "AM";
    }
    return `${((hours + 11) % 12) + 1}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

export  const formatTo12Hr = (timeStr) => {
  console.log("Formatting time:", timeStr);
    if (!timeStr || timeStr === "--:--:--") return timeStr;
    const [h, m, s] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = ((hour + 11) % 12) + 1;
    return `${displayHour}:${m}:${s} ${ampm}`;
  };

export const calculateTimeDifference = (start, end) => {
    if (!start || !end || start === "--:--:--" || end === "--:--:--") {
      return { hours: 0, minutes: 0 };
    }

    const [startHour, startMin, startSec] = start.split(":").map(Number);
    const [endHour, endMin, endSec] = end.split(":").map(Number);

    let startInMins = startHour * 60 + startMin + (startSec || 0) / 60;
    let endInMins = endHour * 60 + endMin + (endSec || 0) / 60;

    if (endInMins < startInMins) {
      endInMins += 24 * 60;
    }

    const diffMins = endInMins - startInMins;

    const roundedTotalMins = Math.round(diffMins);

    const hours = Math.floor(roundedTotalMins / 60);
    const minutes = roundedTotalMins % 60;

    return { hours, minutes };
  };

export  const formatFirebaseTime = (timestamp, use24Hour = true) => {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      return "--:--:--";
    }

    const date = timestamp.toDate();

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !use24Hour,
    });
  };