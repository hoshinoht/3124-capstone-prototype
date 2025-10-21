-- Seed data for initial setup

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt cost 12
INSERT INTO users (username, email, password_hash, full_name, department, role) VALUES
('admin', 'admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIl.4bJW7C', 'System Administrator', 'Admin', 'admin'),
('john_it', 'john@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIl.4bJW7C', 'John Doe', 'IT', 'user'),
('sarah_eng', 'sarah@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIl.4bJW7C', 'Sarah Smith', 'Engineering', 'user');

-- Insert sample equipment
INSERT INTO equipment (name, equipment_type, model, serial_number, description) VALUES
('Laptop Dell XPS 15', 'Computer', 'XPS 15 9520', 'DL001', 'High-performance laptop for development'),
('Network Analyzer', 'Testing Equipment', 'Fluke NetAlly', 'NA001', 'Network diagnostic tool'),
('HVAC Test Kit', 'Testing Equipment', 'Testo 480', 'HV001', 'Complete HVAC measurement kit'),
('Oscilloscope', 'Testing Equipment', 'Keysight DSOX3024A', 'OS001', 'Digital oscilloscope'),
('Project Tablet', 'Computer', 'iPad Pro 12.9', 'TB001', 'For on-site documentation');

-- Insert glossary categories
INSERT INTO glossary_categories (name, description, display_order) VALUES
('HVAC Abbreviations', 'Heating, Ventilation, and Air Conditioning terminology', 1),
('BMS Quick Actions', 'Building Management System quick reference', 2),
('IT Terms', 'Information Technology terminology', 3),
('General Engineering', 'General engineering terms and concepts', 4);

-- Insert sub-categories
INSERT INTO glossary_categories (name, description, parent_category_id, display_order) VALUES
('Air Temperatures', 'Temperature-related HVAC terms', 1, 1),
('Pressures', 'Pressure-related HVAC terms', 1, 2),
('Air Handling Components', 'HVAC air handling equipment', 1, 3),
('Water Side', 'Water-related HVAC systems', 1, 4),
('Water Temperatures', 'Water temperature measurements', 1, 5),
('Other HVAC/Controls', 'General HVAC control terms', 1, 6),
('Temperature Control', 'BMS temperature control actions', 2, 1),
('Humidity Control', 'BMS humidity control actions', 2, 2),
('Ventilation & Air Quality', 'BMS ventilation control actions', 2, 3),
('Airflow & Pressure', 'BMS airflow control actions', 2, 4),
('Water Side Controls', 'BMS water system controls', 2, 5);

-- Insert glossary terms - HVAC Air Temperatures
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Return Air Temperature', 'RAT', 'Temperature of air returning from the conditioned space to the air handling unit', 5, 1),
('Supply Air Temperature', 'SAT', 'Temperature of air being supplied from the air handling unit to the conditioned space', 5, 1),
('Mixed Air Temperature', 'MAT', 'Temperature of air mixture after return air and outdoor air are combined', 5, 1),
('Outdoor Air Temperature', 'OAT', 'Temperature of the outside ambient air', 5, 1);

-- Insert glossary terms - HVAC Pressures
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Supply Air Pressure', 'SAP', 'Pressure of air being supplied to the distribution system', 6, 1),
('Return Air Pressure', 'RAP', 'Pressure of air returning from the conditioned space', 6, 1),
('Differential Pressure', 'DP', 'Difference in pressure between two points in the system', 6, 1);

-- Insert glossary terms - Air Handling Components
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Air Handling Unit', 'AHU', 'Central unit that conditions and circulates air as part of the HVAC system', 7, 1),
('Fan Coil Unit', 'FCU', 'Device consisting of a heating/cooling coil and a fan', 7, 1),
('Variable Air Volume', 'VAV', 'HVAC system that varies airflow at a constant temperature', 7, 1),
('Pre-Cool Air Damper', 'PAD', 'Damper that controls pre-cooled air flow', 7, 1),
('Outdoor Air Damper', 'OAD', 'Damper controlling the amount of outdoor air entering the system', 7, 1),
('Return Air Damper', 'RAD', 'Damper controlling return air flow', 7, 1);

-- Insert glossary terms - Water Side
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Chilled Water', 'CHW', 'Water that has been cooled by a chiller for use in cooling coils', 8, 1),
('Chilled Water Pump', 'CHWP', 'Pump that circulates chilled water through the system', 8, 1),
('Condenser Water Pump', 'CWP', 'Pump that circulates water through the condenser', 8, 1),
('Cooling Tower', 'CT', 'Heat rejection device that cools water through evaporation', 8, 1),
('Chiller', 'CH', 'Machine that removes heat from a liquid via vapor-compression cycle', 8, 1);

-- Insert glossary terms - Water Temperatures
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Chilled Water Supply Temperature', 'CHWS', 'Temperature of chilled water leaving the chiller', 9, 1),
('Chilled Water Return Temperature', 'CHWR', 'Temperature of chilled water returning to the chiller', 9, 1),
('Condenser Water Supply Temperature', 'CDWS', 'Temperature of condenser water supply', 9, 1),
('Condenser Water Return Temperature', 'CDWR', 'Temperature of condenser water return', 9, 1);

-- Insert glossary terms - Other HVAC/Controls
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, created_by) VALUES
('Relative Humidity', 'RH', 'Amount of moisture in the air relative to maximum amount at that temperature', 10, 1),
('Carbon Dioxide', 'CO₂', 'Gas measured to determine air quality and ventilation effectiveness', 10, 1),
('Electronically Commutated Fan', 'EC Fan', 'High-efficiency fan motor with electronic controls', 10, 1),
('Setpoint', 'SP', 'Desired target value for a controlled parameter (e.g., SAT-SP = Supply Air Temp Setpoint)', 10, 1);

-- Insert BMS Quick Action terms
INSERT INTO glossary_terms (term, abbreviation, definition, category_id, examples, created_by) VALUES
('Zone Temperature Control', 'ZT', 'Adjust FCU/VAV damper air volume or CHW valve position to control zone temperature', 11, '["Increase FCU fan speed", "Adjust VAV damper position", "Modulate CHW valve"]', 1),
('Supply Air Temperature Control', 'SAT Control', 'Adjust AHU chilled water valve (cooling coil) or duct heater to control supply air temperature', 11, '["Increase cooling coil valve opening", "Activate duct heater"]', 1),
('High Relative Humidity Action', 'RH High', 'Activate or increase reheat coil (electric/duct heater) to remove moisture through cool-reheat cycle', 12, '["Enable reheat coil", "Increase dehumidification cycle"]', 1),
('Low Relative Humidity Action', 'RH Low', 'Activate humidifier (steam/atomizing type) to increase moisture content', 12, '["Enable steam humidifier", "Activate atomizing system"]', 1),
('High CO₂ Level Action', 'CO₂ High', 'Increase Outside Air Damper (OAD) opening or Pre-cool Air Damper (PAD) to improve ventilation', 13, '["Increase OAD to 40%", "Open PAD for fresh air"]', 1),
('Supply Air Pressure Control', 'SAP Control', 'Adjust AHU/EC Fan speed using Variable Speed Drive (VSD)', 14, '["Increase fan speed to 75%", "Reduce VSD frequency"]', 1),
('Chilled Water Temperature Control', 'CHWS Control', 'Adjust chiller setpoint or chiller staging to control chilled water supply temperature', 15, '["Lower chiller setpoint to 6°C", "Stage second chiller"]', 1);

-- Insert sample quick links
INSERT INTO quick_links (title, url, description, icon, category, is_pinned, created_by) VALUES
('Weekly Team Meeting', 'https://teams.microsoft.com/l/meetup-join/weekly-team', 'Recurring Monday 10AM team sync', '📅', 'Meetings', 1, 1),
('Client Project Dashboard', 'https://project.company.com/dashboard', 'Main client project tracking', '📊', 'Projects', 1, 1),
('HVAC Documentation', 'https://docs.company.com/hvac', 'HVAC system documentation portal', '📚', 'Documentation', 0, 1),
('Equipment Request Form', 'https://forms.company.com/equipment', 'Submit equipment purchase requests', '🛠️', 'Forms', 0, 1),
('IT Support Portal', 'https://support.company.com', 'Internal IT support ticketing system', '🎫', 'Support', 0, 1);

-- Insert sample calendar events
INSERT INTO calendar_events (title, description, event_type, start_datetime, end_datetime, location, color_code, created_by) VALUES
('Weekly Team Standup', 'Monday morning team synchronization', 'meeting', datetime('now', '+1 day', '10:00'), datetime('now', '+1 day', '11:00'), 'Conference Room A', '#4285F4', 1),
('Equipment Delivery', 'New HVAC testing equipment arrival', 'shipping', datetime('now', '+3 days', '14:00'), datetime('now', '+3 days', '16:00'), 'Loading Dock', '#34A853', 1),
('Project Deadline: Site Installation', 'Complete on-site BMS installation', 'deadline', datetime('now', '+7 days', '17:00'), datetime('now', '+7 days', '17:00'), 'Client Site', '#EA4335', 1);

-- Insert sample tasks
INSERT INTO tasks (title, description, urgency_level, status, deadline, assigned_to, assigned_by, project_name) VALUES
('Update BMS Configuration', 'Update temperature setpoints for Building A HVAC system', 'urgent', 'todo', datetime('now', '+2 days'), 3, 1, 'Building A Retrofit'),
('Review Network Architecture', 'Review proposed network topology for new installation', 'high', 'in_progress', datetime('now', '+5 days'), 2, 1, 'Network Upgrade'),
('Prepare Training Materials', 'Create user guide for new dashboard features', 'medium', 'todo', datetime('now', '+10 days'), 2, 1, 'Internal Tools'),
('Equipment Calibration', 'Calibrate HVAC test equipment', 'low', 'todo', datetime('now', '+14 days'), 3, 1, 'Maintenance');

-- Insert sample personnel status
INSERT INTO personnel_status (user_id, status, location, notes) VALUES
(1, 'available', 'Office - Desk 101', 'Available for meetings'),
(2, 'on_site', 'Client Site - Building A', 'Installing network equipment'),
(3, 'busy', 'Office - Lab', 'Testing HVAC controls');
