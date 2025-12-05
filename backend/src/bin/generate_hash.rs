use bcrypt::{DEFAULT_COST, hash};

// for prototyping purposes only
// NEVER EVER USE THIS IN PRODUCTION!
fn main() {
    let passwords = vec![
        ("admin123", "admin@company.com"),
        ("password123", "demo users"),
        ("javier21", "javier21choo@gmail.com"),
    ];

    println!(
        "Generating bcrypt hashes with DEFAULT_COST ({}):\n",
        DEFAULT_COST
    );

    for (password, user) in passwords {
        match hash(password, DEFAULT_COST) {
            Ok(hashed) => {
                println!("User: {}", user);
                println!("Password: {}", password);
                println!("Hash: {}\n", hashed);
            }
            Err(e) => {
                eprintln!("Error hashing '{}': {:?}", password, e);
            }
        }
    }
}
