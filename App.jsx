import React, { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import './App.css';

const initialDoctors = [
  { name: 'Dr. Smith', specialty: 'General Practitioner', slots: [] },
  { name: 'Dr. Johnson', specialty: 'Dentist', slots: [] },
  { name: 'Dr. Matampane', specialty: 'Post-birth Care', slots: [] }
];

const timeSlots = [
  '07:00 AM', '07:15 AM', '07:30 AM', '07:45 AM', '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', 
  '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', 
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM', '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', 
  '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM', '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', 
  '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM', '04:00 PM'
];

function App() {
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date().toLocaleString());
  const [appointments, setAppointments] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customSlot, setCustomSlot] = useState('');
  const [error, setError] = useState('');
  const [popUpMessage, setPopUpMessage] = useState('');
  const [availableDoctors, setAvailableDoctors] = useState(initialDoctors);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedAppointments = JSON.parse(localStorage.getItem('appointments')) || [];
    setAppointments(savedAppointments);
  }, []);

  const convertTo24HourFormat = (time) => {
    const [hour, minutes, period] = time.split(/[: ]/);
    let hour24 = parseInt(hour, 10);

    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  const isTimeValid = (date, time) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${date}T${time}`);
    return appointmentDateTime >= now;
  };

  const isSlotWithinWorkingHours = (time) => {
    const [hour] = time.split(':');
    const hour24 = parseInt(hour, 10);
    return hour24 >= 7 && hour24 <= 16;
  };

  const isSlotTaken = (doctor, date, time) => {
    return appointments.some(appt =>
      appt.doctor === doctor && appt.date === date && appt.slot === time
    );
  };

  const handleBookAppointment = useCallback((e) => {
    e.preventDefault();

    const finalSlot = selectedSlot === 'custom' ? convertTo24HourFormat(customSlot) : convertTo24HourFormat(selectedSlot);

    if (name.trim() === '' || !date || !selectedDoctor || !finalSlot) {
      setError('Please fill out all fields.');
      return;
    }

    if (!isTimeValid(date, finalSlot)) {
      setError('Date and time cannot be in the past.');
      return;
    }

    if (!isSlotWithinWorkingHours(finalSlot)) {
      setError('The selected time is outside of hospital working hours (7 AM to 4 PM).');
      return;
    }

    if (isSlotTaken(selectedDoctor, date, finalSlot)) {
      setPopUpMessage('This slot is already taken. Please choose a different slot.');
      setError('');
      return;
    }

    const newAppointment = {
      time: new Date().toLocaleString(),
      name,
      date,
      doctor: selectedDoctor,
      slot: finalSlot
    };

    const updatedAppointments = [...appointments, newAppointment];
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

    setAvailableDoctors(prevDoctors =>
      prevDoctors.map(doc =>
        doc.name === selectedDoctor
          ? { ...doc, slots: doc.slots.filter(slot => slot !== finalSlot) }
          : doc
      )
    );

    setName('');
    setDate('');
    setSelectedDoctor('');
    setSelectedSlot('');
    setCustomSlot('');
    setError('');
    setPopUpMessage('');
  }, [appointments, name, date, selectedDoctor, selectedSlot, customSlot, availableDoctors]);

  const handleDoctorChange = (e) => {
    setSelectedDoctor(e.target.value);
  };

  const handleSlotChange = (e) => {
    setSelectedSlot(e.target.value);
    if (e.target.value !== 'custom') {
      setCustomSlot('');
    }
  };

  const handleCustomSlotChange = (e) => {
    setCustomSlot(e.target.value);
  };

  const handleSetAvailability = (e) => {
    e.preventDefault();

    const doctorName = e.target.elements.doctor.value;
    const slot = e.target.elements.slot.value;
    const date = e.target.elements.date.value;

    if (!date || !slot) {
      setPopUpMessage('Please select both date and slot.');
      return;
    }

    const formattedSlot = convertTo24HourFormat(slot);
    const appointmentDateTime = new Date(`${date}T${formattedSlot}`);
    
    if (appointmentDateTime <= new Date()) {
      setPopUpMessage('You cannot set availability for past dates.');
      return;
    }
    
    if (!isSlotWithinWorkingHours(formattedSlot)) {
      setPopUpMessage('The selected time is outside of hospital working hours (7 AM to 4 PM).');
      return;
    }
    
    if (availableDoctors.find(doc => doc.name === doctorName).slots.includes(formattedSlot)) {
      setPopUpMessage('This slot is already set for this doctor.');
      return;
    }

    setAvailableDoctors(prevDoctors =>
      prevDoctors.map(doc =>
        doc.name === doctorName
          ? { ...doc, slots: [...doc.slots, formattedSlot] }
          : doc
      )
    );
  };

  const handleRemoveAppointment = (apptToRemove) => {
    const updatedAppointments = appointments.filter(appt => appt !== apptToRemove);
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

    setAvailableDoctors(prevDoctors =>
      prevDoctors.map(doc =>
        doc.name === apptToRemove.doctor
          ? { ...doc, slots: [...doc.slots, apptToRemove.slot] }
          : doc
      )
    );
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentPage((prevPage) => Math.min(prevPage + 1, 3)),
    onSwipedRight: () => setCurrentPage((prevPage) => Math.max(prevPage - 1, 0))
  });

  return (
    <div className="app" {...swipeHandlers}>
      {currentPage === 0 && (
        <div className="doctor-availability">
          <h1>Welcome to Magatle Hospital</h1>
          <h2>Doctor Availability</h2>
          {availableDoctors.map((doctor, index) => (
            <div key={index} className="doctor-section">
              <h3>{doctor.name}</h3>
              <p>Specialty: {doctor.specialty}</p>
              <p>Available Slots:</p>
              {doctor.slots.length ? (
                <ul>
                  {doctor.slots.map(slot => {
                    const hour = parseInt(slot.split(':')[0], 10);
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    return <li key={slot}>{`${displayHour.toString().padStart(2, '0')}:${slot.split(':')[1]} ${period}`}</li>;
                  })}
                </ul>
              ) : (
                <p>No slots available</p>
              )}
              <form onSubmit={handleSetAvailability}>
                <input type="hidden" name="doctor" value={doctor.name} />
                <div>
                  <label htmlFor="date">Date:</label>
                  <input id="date" name="date" type="date" required />
                </div>
                <div>
                  <label htmlFor="slot">Slot:</label>
                  <select id="slot" name="slot" required>
                    {timeSlots.map((slot, index) => (
                      <option key={index} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <button type="submit">Set Availability</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {currentPage === 1 && (
        <div className="appointment-booking">
          <h1>Book an Appointment</h1>
          <form onSubmit={handleBookAppointment}>
            <div>
              <label htmlFor="name">Name:</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="date">Date:</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="doctor">Select Doctor:</label>
              <select id="doctor" value={selectedDoctor} onChange={handleDoctorChange} required>
                <option value="">--Select Doctor--</option>
                {availableDoctors.map((doctor, index) => (
                  <option key={index} value={doctor.name}>{doctor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="slot">Select Slot:</label>
              <select id="slot" value={selectedSlot} onChange={handleSlotChange} required>
                <option value="">--Select Slot--</option>
                {timeSlots.map((slot, index) => (
                  <option key={index} value={slot}>{slot}</option>
                ))}
                <option value="custom">Custom Slot</option>
              </select>
            </div>
            {selectedSlot === 'custom' && (
              <div>
                <label htmlFor="custom-slot">Custom Slot:</label>
                <input id="custom-slot" type="text" value={customSlot} onChange={handleCustomSlotChange} placeholder="HH:MM AM/PM" />
              </div>
            )}
            <button type="submit">Book Appointment</button>
            {error && <p className="error">{error}</p>}
            {popUpMessage && <p className="popup">{popUpMessage}</p>}
          </form>
        </div>
      )}
{currentPage === 2 && (
  <div className="appointments-list">
    <h1>Your Appointments</h1>
    {appointments.length ? (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Doctor</th>
            <th>Slot</th>
            <th>Booked At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt, index) => (
            <tr key={index}>
              <td>{appt.name}</td>
              <td>{appt.date}</td>
              <td>{appt.doctor}</td>
              <td>{appt.slot}</td>
              <td>{appt.time}</td>
              <td><button onClick={() => handleRemoveAppointment(appt)}>Cancel Appointment</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>No appointments found.</p>
    )}
  </div>
)}


      {currentPage === 3 && (
        <div className="about">
          <h1>About Us</h1>
          <p>Magatle Hospital is committed to providing the best healthcare services. Our doctors are experienced and dedicated to helping you with your health needs.</p>
        </div>
      )}

      <div className="pagination">
        <button onClick={() => setCurrentPage((prevPage) => Math.max(prevPage - 1, 0))}>Previous</button>
        <button onClick={() => setCurrentPage((prevPage) => Math.min(prevPage + 1, 3))}>Next</button>
      </div>
    </div>
  );
}

export default App;
