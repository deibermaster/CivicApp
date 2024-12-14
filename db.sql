-- Active: 1733172526714@@127.0.0.1@3306@civicapp

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    photo VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);