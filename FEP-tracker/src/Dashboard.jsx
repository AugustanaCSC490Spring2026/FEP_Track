import { useState } from "react"

function Dashboard(){

    const [title, setTitle] = useState("")
    const [time, setTime] = useState("")
    const [events, setEvents] = useState([])

    function addEvent() {
        if (!title || !time) return

        const newEvent = {
            id: Date.now(),
            title: title,
            time: time
        }

        setEvents([...events, newEvent])
        setTitle("")
        setTime("")
    }

    function deleteEvent(id) {
        setEvents(events.filter(event => event.id !== id))
    }

    return(
        <div style={{maxWidth:"600px", margin:"auto", textAlign:"center"}}>

            <h1>Schedule Dashboard</h1>

            <div style={{marginBottom:"20px"}}>
                <input
                    type="text"
                    placeholder="Event name"
                    value={title}
                    onChange={(e)=>setTitle(e.target.value)}
                />

                <input
                    type="time"
                    value={time}
                    onChange={(e)=>setTime(e.target.value)}
                />

                <button onClick={addEvent}>
                    Add Event
                </button>
            </div>

            <div>
                {events.map((event)=>(
                    <div key={event.id}>
                        <span>{event.time} - {event.title}</span>
                        <button onClick={()=>deleteEvent(event.id)}>
                            Delete
                        </button>
                    </div>
                ))}
            </div>

        </div>
    )
}

export default Dashboard