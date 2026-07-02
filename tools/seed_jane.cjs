const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sentinel'
});

const categorias = [
  { name: 'Cerámicas', description: 'Obras de arte hechas en arcilla y cocidas al horno.' },
  { name: 'Textilería', description: 'Tejidos tradicionales a mano con lana de alpaca y oveja.' },
  { name: 'Joyería', description: 'Accesorios hechos en plata y piedras preciosas.' }
];

const productos = [
  {
    cat: 'Cerámicas',
    name: 'Jarrón de Arcilla Tradicional',
    description: 'Jarrón tallado a mano con técnicas milenarias de la sierra.',
    price: 45.50,
    stock: 20,
    image_url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Cerámicas',
    name: 'Plato Decorativo Andino',
    description: 'Plato de cerámica pintado a mano con motivos andinos.',
    price: 30.00,
    stock: 15,
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Cerámicas',
    name: 'Vasija Ceremonial Inca',
    description: 'Réplica de una vasija ceremonial de la época Inca.',
    price: 85.00,
    stock: 5,
    image_url: 'https://images.unsplash.com/photo-1605374464191-236440db63c1?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Cerámicas',
    name: 'Macetero Rústico',
    description: 'Macetero de barro ideal para suculentas y plantas pequeñas.',
    price: 18.50,
    stock: 30,
    image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Textilería',
    name: 'Poncho de Alpaca',
    description: 'Poncho 100% fibra de alpaca, súper suave y abrigador.',
    price: 120.00,
    stock: 10,
    image_url: 'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Textilería',
    name: 'Chullo Andino',
    description: 'Gorro tradicional con orejeras tejido a mano.',
    price: 25.00,
    stock: 25,
    image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Textilería',
    name: 'Manta Incaica',
    description: 'Colorida manta tejida en telar de cintura.',
    price: 65.00,
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Textilería',
    name: 'Bufanda de Llama',
    description: 'Bufanda cálida hecha de lana de llama.',
    price: 35.00,
    stock: 40,
    image_url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Joyería',
    name: 'Collar de Plata 925',
    description: 'Hermoso collar de plata con incrustaciones de lapislázuli.',
    price: 95.00,
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1599643478514-4a11011c7700?auto=format&fit=crop&q=80&w=800',
    is_published: true
  },
  {
    cat: 'Joyería',
    name: 'Pulsera de Huayruro',
    description: 'Pulsera protectora con semillas de huayruro.',
    price: 15.00,
    stock: 50,
    image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
    is_published: true
  }
];

async function seed() {
  try {
    console.log("Iniciando seeder de JANE Artisans...");
    
    // Insertar Categorías
    const catMap = {};
    for (const c of categorias) {
      const result = await pool.query(
        `INSERT INTO categorias (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
        [c.name, c.description]
      );
      catMap[c.name] = result.rows[0].id;
    }
    console.log("Categorías listas.");

    // Insertar Productos
    for (const p of productos) {
      const catId = catMap[p.cat];
      const exists = await pool.query('SELECT id FROM productos WHERE name = $1', [p.name]);
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO productos (categoria_id, name, description, price, stock, image_url, is_published) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [catId, p.name, p.description, p.price, p.stock, p.image_url, p.is_published]
        );
      }
    }
    console.log("Productos inyectados exitosamente.");
    
  } catch (error) {
    console.error("Error en el seeder:", error);
  } finally {
    pool.end();
  }
}

seed();
