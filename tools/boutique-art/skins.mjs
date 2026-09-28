// Skins épiques des 6 héros : les dessins d'origine (src/ui/art.js, src/ui/sprites.js), recolorés,
// avec des accessoires dessinés dans le même moteur low-poly. Aucun texte.
// Chaque skin : lobby (pleine pied) et combat (¾ dos). Code des accessoires évalué dans le bloc du héros.

// Petits dessins communs, injectés dans le bloc (fonctions locales au héros).
const LIB = `
const _rot = (pts, x, y, a) => pts.map(([u, v]) => [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)]);
const flower = (x, y, r, col, mid) => { for (let i = 0; i < 5; i++) { const t = i * 2 * Math.PI / 5 - Math.PI / 2; S.push({ p: ngon(x + Math.cos(t) * r * .62, y + Math.sin(t) * r * .62, r * .5, r * .5, 6, t), c: col, sw: 2.5, sil: false }); } S.push({ p: ngon(x, y, r * .36, r * .36, 6), c: mid || '#FFD23F', sw: 2.2, sil: false }); };
const leaf = (x, y, s, a, col) => S.push({ p: _rot([[0, -s], [s * .35, -s * .45], [s * .85, -s * .55], [s * .5, 0], [s * .75, s * .45], [0, s * .3], [-s * .75, s * .45], [-s * .5, 0], [-s * .85, -s * .55], [-s * .35, -s * .45]], x, y, a), c: col, sw: 2.5, sil: false });
const star = (x, y, s, col) => spark(S, x, y, s, col);
const gemBit = (x, y, s, col) => S.push({ p: [[x, y - s], [x + s * .8, y - s * .2], [x, y + s], [x - s * .8, y - s * .2]], c: col, sw: 2.5, sil: false });
`;

export const SKINS = [
  {
    hero: 'aldric', id: 'hiver', name: "Aldric d'hiver",
    lobby: {
      colors: { '#B7C3CE': '#DCE9F4', '#98A5B2': '#AFC4D6', '#FF8C32': '#4FA9E0', '#E0662A': '#2C5F96', '#5C3A22': '#3A4E6B', '#FFD23F': '#E9F7FF', '#DCE5EC': '#EAF6FF' },
      at: [
        // cape fourrée : bordure de fourrure en bas de la cape (derrière le corps)
        ['leg(S, [108, 192]', LIB + `S.push({ p: [[70, 250], [86, 244], [104, 256], [126, 266], [150, 258], [178, 250], [182, 262], [158, 274], [126, 280], [96, 272], [66, 262]], c: '#F4F8FB', sw: 4 });`],
        // col de fourrure sur les épaules, sous la tête
        ['head(S, 122, 90, 36, sk);', `S.push({ p: [[84, 132], [92, 118], [108, 112], [122, 118], [138, 112], [154, 118], [162, 132], [150, 146], [134, 140], [122, 148], [110, 140], [94, 146]], c: '#F4F8FB' });`]
      ],
      // capuche de fourrure légère sur les cheveux, flocons
      post: `S.push({ p: [[88, 80], [96, 60], [116, 50], [140, 50], [158, 62], [160, 78], [150, 70], [132, 64], [112, 66], [96, 76]], c: '#F4F8FB', sw: 4 });
        star(34, 120, 8, '#FFFFFF'); star(48, 262, 6, '#CFEAFF'); star(212, 206, 7, '#FFFFFF'); star(196, 96, 6, '#CFEAFF');`
    },
    combat: {
      colors: { '#B7C3CE': '#DCE9F4', '#98A5B2': '#AFC4D6', '#FF8C32': '#4FA9E0', '#E0662A': '#2C5F96', '#5C3A22': '#3A4E6B', '#8A5530': '#6E8FB0', '#DCE5EC': '#EAF6FF' },
      rep: [['const S = [], sk', 'const Y = \'#E9F7FF\', S = [], sk']],
      at: [
        ['headBack(S, 122, 90, 36, sk,', LIB + `S.push({ p: [[76, 252], [96, 246], [122, 258], [148, 248], [168, 254], [166, 266], [140, 274], [110, 276], [82, 266]], c: '#F4F8FB', sw: 4 });
          S.push({ p: [[84, 134], [94, 118], [110, 112], [122, 118], [136, 112], [152, 118], [162, 134], [148, 146], [122, 142], [96, 146]], c: '#F4F8FB' });`]
      ],
      post: `star(40, 112, 7, '#FFFFFF'); star(210, 214, 6, '#CFEAFF');`
    }
  },
  {
    hero: 'nyra', id: 'carnaval', name: 'Nyra du carnaval',
    lobby: {
      colors: { '#2F3A44': '#5B2C86', '#3E4B58': '#B8327A', '#3DDC5B': '#FFD23F', '#1E252C': '#2A1740', '#1F7A3D': '#6B2C9A', '#CFF5D6': '#FFF1D6' },
      at: [
        // rubans colorés qui flottent derrière (sous le corps)
        ['arm(S, [104, 152], [80, 144], [62, 124]', LIB + `
          const rib = (pts, col) => S.push({ p: pts, c: col, sw: 3.5 });
          rib([[110, 76], [80, 64], [50, 76], [26, 66], [30, 78], [52, 88], [82, 78], [108, 88]], '#FF5A3C');
          rib([[106, 90], [74, 92], [46, 110], [22, 104], [28, 116], [50, 122], [76, 104], [104, 102]], '#3DDC5B');
          rib([[160, 70], [184, 52], [208, 58], [226, 44], [228, 58], [210, 70], [188, 66], [166, 82]], '#4FA9E0');`],
        // losanges d'arlequin sur la tunique
        ['S.push({ p: limb([104, 196], [148, 188], 8, 8), c: A });', `
          S.push({ p: [[124, 150], [134, 164], [124, 178], [114, 164]], c: '#FFD23F', sw: 3, sil: false });
          S.push({ p: [[108, 168], [116, 180], [108, 192], [100, 180]], c: '#4FA9E0', sw: 3, sil: false });
          S.push({ p: [[140, 166], [148, 178], [140, 190], [132, 178]], c: '#3DDC5B', sw: 3, sil: false });`],
        // masque vénitien, sous les yeux (les yeux restent visibles)
        ['S.push(face(130, 110, 34,', `
          S.push({ p: [[96, 96], [106, 102], [118, 100], [130, 106], [142, 100], [156, 100], [168, 90], [166, 108], [154, 122], [138, 120], [130, 114], [122, 120], [106, 122], [98, 112]], c: '#FFF4DC' });
          S.push({ p: [[96, 96], [106, 102], [104, 108], [98, 104]], c: '#FFD23F', sw: 2.5, sil: false });
          S.push({ p: [[168, 90], [166, 108], [160, 104], [162, 96]], c: '#FFD23F', sw: 2.5, sil: false });`]
      ],
      // plume sur la capuche, confettis
      post: `S.push({ p: [[150, 78], [168, 40], [182, 22], [178, 44], [166, 70], [158, 84]], c: '#FF5A3C', sw: 3.5 });
        S.push({ p: [[156, 76], [170, 46], [176, 36], [172, 52], [162, 74]], c: '#FFD23F', sw: 2, sil: false });
        gemBit(58, 250, 5, '#FFD23F'); gemBit(210, 222, 5, '#3DDC5B'); gemBit(40, 170, 4, '#4FA9E0'); gemBit(214, 110, 4, '#FF5A3C');`
    },
    combat: {
      colors: { '#2F3A44': '#5B2C86', '#3E4B58': '#B8327A', '#1E252C': '#2A1740', '#CFF5D6': '#FFF1D6' },
      rep: [["A = '#3DDC5B'", "A = '#FFD23F'"]],
      at: [
        ['S.push({ p: [[106, 140], [62, 120]', LIB + `
          const rib = (pts, col) => S.push({ p: pts, c: col, sw: 3.5 });
          rib([[112, 70], [82, 58], [52, 70], [28, 60], [32, 72], [54, 82], [84, 72], [110, 82]], '#FF5A3C');
          rib([[108, 86], [76, 88], [48, 106], [24, 100], [30, 112], [52, 118], [78, 100], [106, 98]], '#3DDC5B');`],
        ['const w0 = S.length;', `
          S.push({ p: [[114, 96], [130, 88], [146, 96], [130, 106]], c: '#FFD23F', sw: 3 });
          S.push({ p: [[118, 104], [104, 122], [112, 124], [124, 108]], c: '#4FA9E0', sw: 3 });
          S.push({ p: [[140, 104], [156, 120], [148, 124], [136, 108]], c: '#FF5A3C', sw: 3 });
          S.push({ p: [[146, 70], [164, 34], [178, 16], [174, 38], [160, 64], [152, 78]], c: '#FF5A3C', sw: 3.5 });`]
      ],
      post: `gemBit(210, 230, 5, '#FFD23F'); gemBit(36, 176, 4, '#4FA9E0');`
    }
  },
  {
    hero: 'boran', id: 'moisson', name: 'Boran de la moisson',
    lobby: {
      colors: { '#8A5A34': '#3F72AE', '#4B3A2C': '#35598A', '#1F7A3D': '#A0703C', '#9ACD32': '#F2C95B', '#2E241C': '#5C3A22' },
      at: [
        // chemise à carreaux sous la salopette, bretelles et boutons
        ['S.push({ p: limb([62, 210], [178, 210], 17, 17)', LIB + `
          S.push({ p: [[96, 130], [146, 130], [134, 168], [108, 168]], c: '#D9452B' });
          S.push({ raw: '<g stroke="#8E2A1C" stroke-width="3" opacity=".7"><line x1="104" y1="132" x2="116" y2="166"/><line x1="138" y1="132" x2="126" y2="166"/><line x1="100" y1="146" x2="142" y2="146"/></g>' });
          S.push({ p: [[80, 176], [162, 176], [168, 222], [74, 222]], c: '#3F72AE' });
          S.push({ p: limb([84, 134], [92, 178], 13, 13), c: '#2F5E96' }); S.push({ p: limb([156, 134], [150, 178], 13, 13), c: '#2F5E96' });
          S.push({ p: ngon(92, 180, 6, 6, 6), c: '#F2C95B', sw: 3 }); S.push({ p: ngon(150, 180, 6, 6, 6), c: '#F2C95B', sw: 3 });
          S.push({ p: [[108, 188], [134, 188], [134, 206], [108, 206]], c: '#2F5E96', sw: 3 });`]
      ],
      // chapeau de paille (au-dessus de la tête), épi de blé
      post: `S.push({ p: ngon(120, 60, 58, 13, 12), c: '#E8B84A' });
        S.push({ p: [[94, 60], [98, 36], [110, 28], [132, 28], [144, 36], [148, 60]], c: '#F2C95B' });
        S.push({ p: [[95, 54], [147, 54], [148, 62], [94, 62]], c: '#D9452B', sw: 3.5 });
        S.push({ raw: '<g stroke="#B9862E" stroke-width="2.5" opacity=".8"><line x1="104" y1="40" x2="104" y2="52"/><line x1="116" y1="34" x2="116" y2="52"/><line x1="128" y1="34" x2="128" y2="52"/><line x1="140" y1="40" x2="140" y2="52"/></g>' });
        S.push({ p: limb([150, 56], [176, 20], 3.5, 3.5), c: '#B9862E', sw: 2.5, sil: false });
        [[172, 26], [168, 32], [176, 32], [164, 38], [172, 38]].forEach(([x, y]) => S.push({ p: ngon(x, y, 3.5, 5, 6), c: '#F2C95B', sw: 2, sil: false }));`
    },
    combat: {
      colors: { '#8A5A34': '#3F72AE', '#4B3A2C': '#35598A', '#1F7A3D': '#A0703C', '#9ACD32': '#F2C95B', '#2E241C': '#5C3A22', '#5C3A22': '#2F5E96' },
      at: [
        ['const w0 = S.length;', LIB + `
          S.push({ p: ngon(120, 62, 58, 13, 12), c: '#E8B84A' });
          S.push({ p: [[94, 62], [98, 38], [110, 30], [132, 30], [144, 38], [148, 62]], c: '#F2C95B' });
          S.push({ p: [[95, 56], [147, 56], [148, 64], [94, 64]], c: '#D9452B', sw: 3.5 });`]
      ]
    }
  },
  {
    hero: 'ilwen', id: 'etoiles', name: 'Ilwen des étoiles',
    lobby: {
      colors: { '#5B3B6E': '#23306E', '#4A2E5C': '#18214E', '#FFD23F': '#8FD3FF', '#FFF1A8': '#E7C8FF', '#8A3B22': '#2A1B5E', '#F8EED6': '#CDB8FF', '#FF8C32': '#FF8FD8' },
      at: [
        ['S.push({ p: limb([92, 176], [150, 176], 10, 10), c: A });', LIB + `
          [[104, 204, 6], [138, 222, 7], [96, 250, 5], [150, 258, 6], [122, 238, 4], [118, 188, 4]].forEach(([x, y, s]) => star(x, y, s, '#FFF6C8'));
          [[86, 270, 3], [160, 276, 3], [112, 264, 3]].forEach(([x, y, s]) => S.push({ p: ngon(x, y, s, s, 5), c: '#FFFFFF', sw: 0, sil: false }));`],
        // grimoire-galaxie : halo violet et spirale d'étoiles, derrière le livre
        ['arm(S, [140, 140], [164, 164], [184, 152]', `
          glow(S, 194, 118, 58, '#7B4DFF', .22);
          [[160, 96, 5, '#FF8FD8'], [228, 96, 5, '#8FD3FF'], [236, 136, 4, '#FFFFFF'], [168, 150, 4, '#E7C8FF'], [206, 88, 4, '#FFFFFF']].forEach(([x, y, s, c]) => star(x, y, s, c));`]
      ],
      // croissant de lune et étoile à la pointe du chapeau
      post: `S.push({ p: [[114, 44], [124, 36], [134, 40], [126, 42], [120, 50]], c: '#FFF6C8', sw: 2.5, sil: false });
        star(176, 8, 10, '#FFF6C8'); star(56, 150, 7, '#FFF6C8'); star(40, 220, 5, '#8FD3FF');`
    },
    combat: {
      colors: { '#5B3B6E': '#23306E', '#4A2E5C': '#18214E', '#FFD23F': '#8FD3FF', '#FFF1A8': '#E7C8FF', '#8A3B22': '#2A1B5E', '#F8EED6': '#CDB8FF', '#FF8C32': '#FF8FD8' },
      at: [
        ['S.push({ p: [[90, 100], [152, 98]', LIB + `
          [[104, 206, 6], [140, 228, 7], [96, 256, 5], [152, 262, 6], [122, 244, 4]].forEach(([x, y, s]) => star(x, y, s, '#FFF6C8'));`],
        ['const w0 = S.length;', `star(178, 10, 10, '#FFF6C8');`]
      ],
      post: `glow(S, 198, 112, 58, '#7B4DFF', .2); star(164, 90, 5, '#FF8FD8'); star(236, 108, 5, '#FFFFFF');`
    }
  },
  {
    hero: 'kestrel', id: 'automne', name: "Kestrel d'automne",
    lobby: {
      colors: { '#6E4A2E': '#B5561F', '#2E7A3E': '#8E3B1E', '#9ACD32': '#E8A23A', '#4A3B2E': '#5A3A26', '#FF5A3C': '#FFB02E' },
      at: [
        ['head(S, 124, 96, 34, sk);', LIB + `
          leaf(106, 138, 11, -.4, '#E8702A');`]
      ],
      post: `leaf(40, 60, 10, .6, '#E8702A'); leaf(214, 250, 9, -.5, '#C0392B'); leaf(30, 186, 8, 1.2, '#F2B33D');
        leaf(62, 262, 8, -.9, '#C0392B'); leaf(176, 26, 9, .3, '#F2B33D'); leaf(150, 70, 8, -.2, '#E8702A');`
    },
    combat: {
      colors: { '#6E4A2E': '#B5561F', '#2E7A3E': '#8E3B1E', '#9ACD32': '#E8A23A', '#4A3B2E': '#5A3A26' },
      rep: [['c: R, sw: 3', "c: '#FFB02E', sw: 3"]],
      at: [['headBack(S, 124, 92, 34, sk, hr);', LIB + `leaf(110, 160, 12, .4, '#E8702A'); leaf(128, 186, 9, -.6, '#F2B33D');`]],
      post: `leaf(40, 70, 10, .6, '#E8702A'); leaf(216, 244, 9, -.5, '#C0392B'); leaf(34, 200, 8, 1.2, '#F2B33D'); leaf(170, 26, 9, .3, '#F2B33D');`
    }
  },
  {
    hero: 'mira', id: 'printemps', name: 'Mira du printemps',
    lobby: {
      colors: { '#F3E6C8': '#FFD3E2', '#FF5A3C': '#5FBF5A', '#8A5530': '#4F9A45', '#D9A62A': '#5FBF5A' },
      at: [
        // fleurs sur la robe
        ['S.push({ p: limb([96, 172], [148, 172], 10, 10), c: A });', LIB + `
          flower(104, 204, 7, '#FFFFFF'); flower(142, 214, 7, '#FF8FB8'); flower(122, 190, 6, '#FFF6C8'); flower(96, 222, 5, '#FF8FB8'); flower(150, 196, 5, '#FFFFFF');`]
      ],
      // couronne de fleurs, amulette en pétales, pétales qui volent
      post: `S.push({ p: limb([90, 70], [154, 66], 7, 7), c: '#5FBF5A', sw: 3 });
        [[92, 70, '#FF8FB8'], [106, 62, '#FFFFFF'], [122, 58, '#FFD23F'], [138, 60, '#FF8FB8'], [152, 66, '#FFFFFF']].forEach(([x, y, c]) => flower(x, y, 8, c, c === '#FFD23F' ? '#FF8FB8' : '#FFD23F'));
        leaf(100, 74, 6, -1.2, '#5FBF5A'); leaf(146, 72, 6, 1.1, '#5FBF5A');
        for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; S.push({ p: ngon(153 + Math.cos(t) * 12, 162 + Math.sin(t) * 12, 8, 6, 6, t), c: '#FF8FB8', sw: 2.5 }); }
        S.push({ p: ngon(153, 162, 8, 8, 6), c: '#FFD23F', sw: 2.5 });
        [[190, 128, .4], [200, 178, -.6], [180, 208, 1], [50, 150, .8]].forEach(([x, y, a]) => S.push({ p: _rot([[0, -6], [4, 0], [0, 6], [-4, 0]], x, y, a), c: '#FF8FB8', sw: 2.5, sil: false }));`
    },
    combat: {
      colors: { '#F3E6C8': '#FFD3E2', '#8A5530': '#4F9A45' },
      rep: [['A = R,', "A = '#5FBF5A',"]],
      at: [
        ['S.push({ p: ngon(104, 142, 13, 11, 6), c: dr });', LIB + `
          flower(102, 206, 7, '#FFFFFF'); flower(142, 212, 7, '#FF8FB8'); flower(96, 224, 5, '#FF8FB8'); flower(152, 200, 5, '#FFFFFF');`],
        ['const w0 = S.length;', `
          [[90, 70, '#FF8FB8'], [104, 60, '#FFFFFF'], [122, 56, '#FFD23F'], [140, 58, '#FF8FB8'], [154, 66, '#FFFFFF']].forEach(([x, y, c]) => flower(x, y, 8, c, c === '#FFD23F' ? '#FF8FB8' : '#FFD23F'));`]
      ],
      post: `[[196, 60, .4], [214, 110, -.6], [44, 150, .8]].forEach(([x, y, a]) => S.push({ p: _rot([[0, -6], [4, 0], [0, 6], [-4, 0]], x, y, a), c: '#FF8FB8', sw: 2.5, sil: false }));`
    }
  }
];
