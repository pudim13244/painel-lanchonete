-- Script para inserir produtos de teste
-- Assumindo que temos categorias com IDs 1-5 e estabelecimento com ID 1

INSERT INTO products (name, description, price, category_id, establishment_id, image_url) VALUES
-- Lanches (categoria_id = 1)
('X-Burger', 'Hambúrguer artesanal com queijo, alface, tomate e maionese especial', 18.90, 1, 1, 'https://source.unsplash.com/400x300/?burger'),
('X-Bacon', 'Hambúrguer com bacon crocante, queijo, alface e tomate', 22.50, 1, 1, 'https://source.unsplash.com/400x300/?bacon-burger'),
('X-Frango', 'Hambúrguer de frango grelhado com queijo e salada', 16.90, 1, 1, 'https://source.unsplash.com/400x300/?chicken-burger'),
('X-Calabresa', 'Hambúrguer com calabresa, queijo e cebola caramelizada', 20.90, 1, 1, 'https://source.unsplash.com/400x300/?sausage-burger'),

-- Pizzas (categoria_id = 2)
('Pizza Margherita', 'Molho de tomate, mussarela, manjericão fresco', 28.90, 2, 1, 'https://source.unsplash.com/400x300/?pizza-margherita'),
('Pizza Pepperoni', 'Molho de tomate, mussarela e pepperoni', 32.90, 2, 1, 'https://source.unsplash.com/400x300/?pizza-pepperoni'),
('Pizza 4 Queijos', 'Molho de tomate, mussarela, parmesão, provolone e gorgonzola', 35.90, 2, 1, 'https://source.unsplash.com/400x300/?pizza-cheese'),

-- Bebidas (categoria_id = 3)
('Coca-Cola 350ml', 'Refrigerante Coca-Cola lata', 5.90, 3, 1, 'https://source.unsplash.com/400x300/?coca-cola'),
('Suco de Laranja Natural', 'Suco de laranja natural 300ml', 8.90, 3, 1, 'https://source.unsplash.com/400x300/?orange-juice'),
('Água Mineral 500ml', 'Água mineral sem gás', 3.50, 3, 1, 'https://source.unsplash.com/400x300/?water-bottle'),
('Cerveja Heineken 350ml', 'Cerveja Heineken lata', 6.90, 3, 1, 'https://source.unsplash.com/400x300/?beer'),

-- Sobremesas (categoria_id = 4)
('Sorvete de Chocolate', 'Sorvete cremoso de chocolate com calda', 12.90, 4, 1, 'https://source.unsplash.com/400x300/?chocolate-ice-cream'),
('Pudim de Leite', 'Pudim de leite condensado com calda de caramelo', 10.90, 4, 1, 'https://source.unsplash.com/400x300/?pudding'),
('Mousse de Maracujá', 'Mousse cremoso de maracujá', 9.90, 4, 1, 'https://source.unsplash.com/400x300/?passion-fruit-mousse'),

-- Combos (categoria_id = 5)
('Combo X-Burger + Batata + Refri', 'X-Burger, batata frita média e refrigerante 350ml', 25.90, 5, 1, 'https://source.unsplash.com/400x300/?combo-burger'),
('Combo Pizza + Refri', 'Pizza média + refrigerante 350ml', 35.90, 5, 1, 'https://source.unsplash.com/400x300/?pizza-combo'),
('Combo Lanche + Suco', 'Qualquer lanche + suco natural 300ml', 22.90, 5, 1, 'https://source.unsplash.com/400x300/?sandwich-juice-combo'); 