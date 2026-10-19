const _0 = (md) => {
return (
md`# Group 28`
)
};

const _5 = (md) => {
return (
md`# Question 1, Matthew Poon`
)
};

const _56 = function q1a_influence_network3(FileAttachment){return(
FileAttachment("q1a_influence_network@3.json").json()
)};

const _60 = function q1b_collab_network2(FileAttachment){return(
FileAttachment("q1b_collab_network@2.json").json()
)};

const _64 = function q1c_oceanus_community2(FileAttachment){return(
FileAttachment("q1c_oceanus_community@2.json").json()
)};

const _21 = (md) => {
return (
md`### Question 1.1. Who has she been most influenced by over time? `
)
};

const _24 = function radialData(q1a_influence_network3)
{
  const radNodes = q1a_influence_network3.nodes;
  const radLinks = q1a_influence_network3.links;

  //get id for object or string
  function getId(ref) {
    if (typeof ref === "object" && ref !== null) {
      return String(ref.id);
    }
    return String(ref);
  }

  // get sailor shift id
  let sailor = null;
  for (let i = 0; i < radNodes.length; i++) {
    let nodeString = JSON.stringify(radNodes[i]).toLowerCase();

    if (nodeString.includes("sailor shift")) {
      sailor = radNodes[i];
      break;
    }
  }
  const sailorId = getId(sailor);

  //get all songs connected to sailor
  let sailorSongIds = new Set();
  radLinks.forEach(function (link) {
    if (getId(link.source) === sailorId) {
      sailorSongIds.add(getId(link.target));
    }
  });

  // get songs that influenced sailors songs
  const influenceTypes = [
    "InterpolatesFrom",
    "DirectlySamples",
    "InStyleOf",
    "CoverOf",
    "LyricalReferenceTo"
  ];
  let songToInfluence = new Map();

  radLinks.forEach(function (link) {
    let sourceId = getId(link.source);
    let targetId = getId(link.target);
    let edgeType = link["Edge Type"];

    if (sailorSongIds.has(sourceId) && influenceTypes.includes(edgeType)) {
      if (!songToInfluence.has(targetId)) {
        songToInfluence.set(targetId, new Set());
      }
      songToInfluence.get(targetId).add(edgeType);
    }
  });

  //get influenced songs original artists
  let influencerArtists = new Map();

  radLinks.forEach(function (link) {
    let songId = getId(link.target);
    let artistId = getId(link.source);
    let edgeType = link["Edge Type"];

    //creation links
    if (songToInfluence.has(songId) && !influenceTypes.includes(edgeType)) {
      if (artistId !== sailorId) {
        let artistNode = radNodes.find((n) => getId(n) === artistId);
        let typesSet = songToInfluence.get(songId);
        let olderNode = radNodes.find((n) => getId(n) === songId);
        let songDate;
        if (olderNode && olderNode.release_date) {
          songDate = new Date(olderNode.release_date);
        } else {
          songDate = new Date(2000, 0, 1);
        }

        let songDecade = Math.floor(songDate.getFullYear() / 10) * 10;

        //add artist if not seen yet
        if (!influencerArtists.has(artistId)) {
          let newArtistObject = Object.assign({}, artistNode);
          newArtistObject.id = artistId;
          newArtistObject.artist =
            artistNode.name || artistNode.artist || "Unknown";
          newArtistObject.isSailorShift = false;
          newArtistObject.date = songDate;
          newArtistObject.decade = songDecade;
          newArtistObject.influenceTypesSet = new Set(typesSet);
          influencerArtists.set(artistId, newArtistObject);
        } else {
          let existingArtist = influencerArtists.get(artistId);

          typesSet.forEach(function (type) {
            existingArtist.influenceTypesSet.add(type);
          });

          if (songDate < existingArtist.date) {
            existingArtist.date = songDate;
            existingArtist.decade = songDecade;
          }
        }
      }
    }
  });

  //d3 arrays
  let finalNodes = [];

  //sailor shift in the centre
  let sailorNode = Object.assign({}, sailor);
  sailorNode.id = sailorId;
  sailorNode.artist = sailor.name;
  sailorNode.isSailorShift = true;
  sailorNode.date = new Date();
  sailorNode.decade = 2040;
  sailorNode.influenceTypesSet = new Set(["N/A"]);
  finalNodes.push(sailorNode);

  // add all influencers
  influencerArtists.forEach(function (artist) {
    finalNodes.push(artist);
  });

  for (let i = 0; i < finalNodes.length; i++) {
    let node = finalNodes[i];
    let typesArray = Array.from(node.influenceTypesSet);

    node.influenceTypesString = typesArray.join(", ");
    if (typesArray.length > 0) {
      node.primaryType = typesArray[0];
    } else {
      node.primaryType = "None";
    }
    node.allTypes = typesArray;

    //magnitude (amount of links)
    let magCount = 0;
    for (let j = 0; j < radLinks.length; j++) {
      if (
        getId(radLinks[j].target) === node.id ||
        getId(radLinks[j].source) === node.id
      ) {
        magCount++;
      }
    }
    node.degree = magCount;
  }

  //sailor links to influencers
  let finalLinks = [];
  influencerArtists.forEach(function (value, artistId) {
    finalLinks.push({
      source: sailorId,
      target: artistId
    });
  });

  return { nodes: finalNodes, links: finalLinks };
}
;

const _26 = function radialLinksChart(radialData,d3)
{
  const chartSize = 1300;
  const centre = chartSize / 2;

  let nodes = [];
  for (let i = 0; i < radialData.nodes.length; i++) {
    nodes.push(Object.assign({}, radialData.nodes[i]));
  }

  let links = [];
  for (let i = 0; i < radialData.links.length; i++) {
    links.push(Object.assign({}, radialData.links[i]));
  }

  let influencers = nodes.filter(function (n) {
    return n.isSailorShift === false;
  });

  let minDegree = d3.min(influencers, (d) => d.degree) || 1;
  let maxDegree = d3.max(influencers, (d) => d.degree) || 1;
  let radiusScale = d3
    .scaleSqrt()
    .domain([minDegree, maxDegree])
    .range([6, 22]);

  //ring time scales
  let timeExtent = d3.extent(influencers, (d) => d.date);
  let timeDiff = timeExtent[1].getTime() - timeExtent[0].getTime();
  let midTime = new Date(timeExtent[0].getTime() + timeDiff * 0.65);

  let timeScale = d3
    .scaleTime()
    .domain([timeExtent[0], midTime, timeExtent[1]])
    .range([centre - 50, 300, 130]);

  //group artists by decade
  let decadeZones = {};
  for (let i = 0; i < influencers.length; i++) {
    let node = influencers[i];
    if (decadeZones[node.decade] === undefined) {
      decadeZones[node.decade] = [];
    }
    decadeZones[node.decade].push(node);
  }

  let decadesList = Object.keys(decadeZones);
  for (let i = 0; i < decadesList.length; i++) {
    let decade = decadesList[i];
    let group = decadeZones[decade];
    let count = group.length;

    for (let j = 0; j < group.length; j++) {
      let node = group[j];
      let angle = (j / count) * 2 * Math.PI;

      let radius = timeScale(node.date);
      let outer = timeScale(new Date(node.decade, 0, 1));
      let inner = timeScale(new Date(node.decade + 10, 0, 1));
      let padding = radiusScale(node.degree) + 2;

      // keep nodes in their ring zone
      let insideRadius = radius;
      if (insideRadius > outer - padding) {
        insideRadius = outer - padding;
      }
      if (insideRadius < inner + padding) {
        insideRadius = inner + padding;
      }

      node.targetRadius = insideRadius;
      node.x = centre + node.targetRadius * Math.cos(angle);
      node.y = centre + node.targetRadius * Math.sin(angle);
    }
  }

  // sailor shift in middle
  nodes.forEach(function (node) {
    if (node.isSailorShift) {
      node.fx = centre;
      node.fy = centre;
    }
  });

  //node colours
  const influenceTypes = [
    "InterpolatesFrom",
    "DirectlySamples",
    "InStyleOf",
    "CoverOf",
    "LyricalReferenceTo"
  ];
  const colours = ["#fc0335", "#6b03fc", "#03fc84", "#0394fc", "#fc7703"];
  let colourScale = d3.scaleOrdinal().domain(influenceTypes).range(colours);

  // dummy nodes to hold rings in place
  let decades = timeScale.ticks(d3.timeYear.every(10));
  let dummyNodes = [];
  for (let i = 0; i < decades.length; i++) {
    dummyNodes.push({
      isDummy: true,
      fx: centre,
      fy: centre - timeScale(decades[i])
    });
  }

  let simNodes = nodes.concat(dummyNodes);

  let container = d3.create("div");
  container.style("width", "100%");
  container.style("font-family", "sans-serif");

  //title
  container
    .append("div")
    .style("text-align", "center")
    .style("font-size", "24px")
    //.style("font-weight", "bold")
    .style("color", "#333")
    .style("margin-bottom", "15px")
    .text("Artists who have influenced Sailor Shift over time");

  // search bar
  let searchBar = container
    .append("div")
    .style("margin", "10px auto")
    .style("width", "fit-content")
    .style("background", "white")
    .style("padding", "6px 16px")
    .style("border-radius", "20px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("display", "flex")
    .style("align-items", "center")
    .style("border", "1px solid #ddd");

  let searchInput = searchBar
    .append("input")
    .attr("type", "text")
    .attr("placeholder", "Search for an artist")
    .style("border", "none")
    .style("outline", "none")
    .style("font-size", "14px")
    .style("width", "180px");

  searchInput.on("input", function () {
    liveSearch = this.value.trim().toLowerCase();
    updateFilters();
  });

  let svg = container
    .append("svg")
    .attr("viewBox", [0, 0, chartSize, chartSize])
    .attr(
      "style",
      "max-width: 100%; height: auto; background: #ffffff; display: block; margin: 0 auto;"
    );

  let highlightLayer = svg.append("g").attr("class", "era-highlight");
  let rings = svg.append("g").attr("class", "timeline-rings");

  decades.forEach(function (decade) {
    let r = timeScale(decade);

    rings
      .append("circle")
      .attr("cx", centre)
      .attr("cy", centre)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#b0b0b0")
      .attr("stroke-dasharray", "4 4");
    rings
      .append("text")
      .attr("class", "ring-text")
      .datum(decade.getFullYear())
      .attr("x", centre)
      .attr("y", centre - r - 8)
      .attr("text-anchor", "middle")
      .attr("fill", "#888")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(decade.getFullYear());
  });

  //d3 physics simulation
  let sim = d3.forceSimulation(simNodes);
  sim.force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .strength(0)
  );
  sim.force(
    "radial",
    d3
      .forceRadial(
        function (d) {
          if (d.isDummy || d.isSailorShift) {
            return 0;
          } else {
            return d.targetRadius;
          }
        },
        centre,
        centre
      )
      .strength(function (d) {
        return d.isDummy ? 0 : 1;
      })
  );

  sim.force(
    "collide",
    d3
      .forceCollide()
      .radius(function (d) {
        if (d.isDummy) {
          return 20;
        }
        let radius = d.isSailorShift ? 50 : radiusScale(d.degree);
        return radius + 3;
      })
      .iterations(4)
  );

  sim.force(
    "charge",
    d3.forceManyBody().strength(function (d) {
      return d.isDummy ? -20 : -50;
    })
  );

  //draw lines
  let link = svg
    .append("g")
    .attr("stroke", "#cccccc")
    .attr("stroke-opacity", 0.4)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", 1.5);

  //draw nodes
  let nodeGroup = svg.append("g").selectAll("g").data(nodes).join("g");

  let circles = nodeGroup
    .append("circle")
    .attr("r", function (d) {
      return d.isSailorShift ? 50 : radiusScale(d.degree);
    })
    .attr("fill", function (d) {
      return d.isSailorShift ? "#89CFF0" : colourScale(d.primaryType);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2.5)
    .style("cursor", "pointer");

  circles.append("title").text(function (d) {
    return (
      "Artist: " +
      d.artist +
      "\nMagnitude: " +
      d.degree +
      "\nYear: " +
      d.date.getFullYear() +
      "\nType: " +
      d.influenceTypesString
    );
  });

  // draw labels
  let labels = nodeGroup
    .append("text")
    .text(function (d) {
      return d.artist;
    })
    .attr("y", function (d) {
      let radius = d.isSailorShift ? 50 : radiusScale(d.degree);
      return -(radius + 8);
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "#444")
    .attr("pointer-events", "none")
    .attr("opacity", function (d) {
      if (d.isSailorShift || d.degree >= 2) {
        return 1;
      }
      return 0;
    });

  nodeGroup
    .filter((d) => d.isSailorShift)
    .select("text")
    .attr("y", 75)
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .attr("fill", "#5DADE2");

  let liveType = null;
  let liveEra = null;
  let liveMagnitude = null;
  let liveSearch = "";

  function updateFilters(duration = 300) {
    nodeGroup
      .transition()
      .duration(duration)
      .attr("opacity", function (d) {
        if (d.isSailorShift) {
          return 1;
        }

        let matchType = true;
        if (liveType !== null) {
          matchType = d.allTypes.includes(liveType);
        }

        let matchEra = true;
        if (liveEra !== null) {
          matchEra = d.decade === liveEra;
        }

        let matchSearch = true;
        if (liveSearch !== "") {
          matchSearch = d.artist.toLowerCase().includes(liveSearch);
        }

        let matchMag = true;
        if (liveMagnitude !== null) {
          matchMag = d.degree === liveMagnitude;
        }

        if (matchType && matchEra && matchSearch && matchMag) {
          return 1;
        } else {
          return 0.05;
        }
      });

    link
      .transition()
      .duration(duration)
      .attr("stroke-opacity", function (l) {
        let target = l.target;

        let matchType = true;
        if (liveType !== null) {
          matchType = target.allTypes.includes(liveType);
        }

        let matchEra = true;
        if (liveEra !== null) {
          matchEra = target.decade === liveEra;
        }

        let matchSearch = true;
        if (liveSearch !== "") {
          matchSearch = target.artist.toLowerCase().includes(liveSearch);
        }

        let matchMag = true;
        if (liveMagnitude !== null) {
          matchMag = target.degree === liveMagnitude;
        }

        if (matchType && matchEra && matchSearch && matchMag) {
          return 0.4;
        } else {
          return 0.02;
        }
      });

    labels
      .transition()
      .duration(duration)
      .attr("opacity", function (d) {
        if (d.isSailorShift) return 1;

        let matchType = true;
        if (liveType !== null) {
          matchType = d.allTypes.includes(liveType);
        }

        let matchEra = true;
        if (liveEra !== null) {
          matchEra = d.decade === liveEra;
        }

        let matchSearch = true;
        if (liveSearch !== "") {
          matchSearch = d.artist.toLowerCase().includes(liveSearch);
        }

        let matchMag = true;
        if (liveMagnitude !== null) {
          matchMag = d.degree === liveMagnitude;
        }

        if (!(matchType && matchEra && matchSearch && matchMag)) {
          return 0;
        }

        if (liveSearch !== "" && matchSearch) {
          return 1;
        }
        if (liveMagnitude !== null && matchMag) {
          return 1;
        }

        if (d.degree >= 2) {
          return 1;
        }
        return 0;
      })
      .attr("font-weight", function (d) {
        if (
          liveSearch !== "" &&
          d.artist.toLowerCase().includes(liveSearch) &&
          !d.isSailorShift
        ) {
          return "bold";
        }
        return "normal";
      });

    let activeData = [];
    if (liveEra !== null) {
      activeData.push(liveEra);
    }

    highlightLayer
      .selectAll("path")
      .data(activeData, (d) => d)
      .join(
        function (enter) {
          return enter
            .append("path")
            .attr("fill", "#5DADE2")
            .attr("opacity", 0)
            .attr("transform", `translate(${centre}, ${centre})`)
            .attr("d", function (d) {
              let outer = timeScale(new Date(d, 0, 1));
              let inner = timeScale(new Date(d + 10, 0, 1));

              return d3.arc()({
                innerRadius: inner,
                outerRadius: outer,
                startAngle: 0,
                endAngle: 2 * Math.PI
              });
            })
            .call((e) =>
              e.transition().duration(duration).attr("opacity", 0.15)
            );
        },
        function (update) {
          return update;
        },
        function (exit) {
          return exit
            .transition()
            .duration(duration)
            .attr("opacity", 0)
            .remove();
        }
      );

    svg
      .selectAll(".ring-text")
      .transition()
      .duration(duration)
      .attr("opacity", function (year) {
        if (liveEra === null || liveEra === year) {
          return 1;
        }
        return 0.2;
      })
      .attr("fill", function (year) {
        if (liveEra === year) {
          return "#5DADE2";
        }
        return "#888";
      });

    filterTypeGroup.selectAll("rect").attr("opacity", function (t) {
      if (liveType === null || liveType === t) {
        return 1;
      }
      return 0.2;
    });

    filterEraGroup
      .selectAll("text.era-label")
      .attr("opacity", function (e) {
        if (liveEra === null || liveEra === e) {
          return 1;
        }
        return 0.2;
      })
      .attr("font-weight", function (e) {
        if (liveEra === e) {
          return "bold";
        }
        return "normal";
      });

    sizeFilterGroup
      .selectAll(".mag-item")
      .transition()
      .duration(duration)
      .attr("opacity", function (m) {
        if (liveMagnitude === null || liveMagnitude === m) {
          return 1;
        }
        return 0.2;
      });
  }

  let filterTypeGroup = svg.append("g").attr("transform", "translate(40, 40)");
  filterTypeGroup
    .append("text")
    .text("Filter by Influence Type:")
    .attr("font-weight", "bold")
    .attr("font-size", "14px")
    .attr("y", -15);

  let typeItems = filterTypeGroup
    .selectAll(".type-item")
    .data(influenceTypes)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      if (liveType === d) {
        liveType = null;
      } else {
        liveType = d;
      }
      updateFilters();
    });

  typeItems
    .append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", (d) => colourScale(d))
    .attr("rx", 3);
  typeItems
    .append("text")
    .text((d) => d)
    .attr("x", 25)
    .attr("y", 12)
    .attr("font-size", "13px")
    .attr("fill", "#333");

  let uniqueDecades = Array.from(
    new Set(influencers.map((d) => d.decade))
  ).sort((a, b) => a - b);
  let filterEraGroup = svg
    .append("g")
    .attr("transform", `translate(${chartSize - 150}, 40)`);
  filterEraGroup
    .append("text")
    .text("Filter by Era:")
    .attr("font-weight", "bold")
    .attr("font-size", "14px")
    .attr("y", -15);

  let eraItems = filterEraGroup
    .selectAll(".era-item")
    .data(uniqueDecades)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      if (liveEra === d) {
        liveEra = null;
      } else {
        liveEra = d;
      }
      updateFilters();
    });

  eraItems
    .append("text")
    .attr("class", "era-label")
    .text((d) => `${d}s`)
    .attr("y", 12)
    .attr("font-size", "13px")
    .attr("fill", "#333");

  let sizeFilterGroup = svg
    .append("g")
    .attr("transform", "translate(40, 1100)");
  sizeFilterGroup
    .append("text")
    .text("Filter by Magnitude:")
    .attr("font-weight", "bold")
    .attr("font-size", "14px")
    .attr("y", -15);

  let uniqueSizes = Array.from(new Set(influencers.map((d) => d.degree))).sort(
    (a, b) => a - b
  );
  let currentY = 0;

  let magItems = sizeFilterGroup
    .selectAll(".mag-item")
    .data(uniqueSizes)
    .enter()
    .append("g")
    .attr("class", "mag-item")
    .style("cursor", "pointer")
    .on("click", function (event, val) {
      if (liveMagnitude === val) {
        liveMagnitude = null;
      } else {
        liveMagnitude = val;
      }
      updateFilters();
    });

  magItems.each(function (val) {
    let r = radiusScale(val);
    let group = d3.select(this);

    group
      .append("circle")
      .attr("cx", 20)
      .attr("cy", currentY + r)
      .attr("r", r)
      .attr("fill", "#bbb")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    group
      .append("text")
      .text(`Magnitude ${val}`)
      .attr("x", 55)
      .attr("y", currentY + r + 4)
      .attr("font-size", "13px")
      .attr("fill", "#333");

    currentY += r * 2 + 15;
  });

  // hovering logic
  circles.on("mouseover", function (event, hoveredNode) {
    let currentOpacity = d3.select(this.parentNode).attr("opacity");
    if (currentOpacity < 1 && currentOpacity !== null) {
      return;
    }

    nodeGroup.attr("opacity", function (d) {
      if (d.id === hoveredNode.id) {
        return 1;
      }

      let isConnected = false;
      for (let i = 0; i < links.length; i++) {
        let l = links[i];
        if (
          (l.source.id === hoveredNode.id && l.target.id === d.id) ||
          (l.target.id === hoveredNode.id && l.source.id === d.id)
        ) {
          isConnected = true;
          break;
        }
      }

      if (isConnected) {
        return 1;
      } else {
        return 0.1;
      }
    });

    link
      .attr("stroke", function (l) {
        if (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) {
          return "#666";
        }
        return "#cccccc";
      })
      .attr("stroke-opacity", function (l) {
        if (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) {
          return 1;
        }
        return 0.05;
      })
      .attr("stroke-width", function (l) {
        if (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) {
          return 2.5;
        }
        return 1.5;
      });

    let group = d3.select(this.parentNode);
    group.select("circle").attr("stroke", "#000").attr("stroke-width", 4);
    group.select("text").attr("opacity", 1).attr("font-weight", "bold");

    if (!hoveredNode.isSailorShift) {
      let nodeRadius = radiusScale(hoveredNode.degree);

      group
        .append("text")
        .attr("class", "hover-info")
        .attr("y", -(nodeRadius + 26))
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "900")
        .attr("fill", colourScale(hoveredNode.primaryType))
        .attr("stroke", "white")
        .attr("stroke-width", 4)
        .attr("paint-order", "stroke")
        .text("INFLUENCE: " + hoveredNode.influenceTypesString);
    }
  });

  circles.on("mouseout", function () {
    updateFilters(0);
    circles.attr("stroke", "#fff").attr("stroke-width", 2.5);
    link.attr("stroke", "#cccccc").attr("stroke-width", 1.5);
    svg.selectAll(".hover-info").remove();
  });

  //physics tick
  sim.on("tick", function () {
    for (let i = 0; i < nodes.length; i++) {
      let d = nodes[i];
      if (!d.isSailorShift && !d.isDummy) {
        let outer = timeScale(new Date(d.decade, 0, 1));
        let inner = timeScale(new Date(d.decade + 10, 0, 1));
        let nodeRadius = radiusScale(d.degree) + 2;
        let dx = d.x - centre;
        let dy = d.y - centre;

        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
          distance = 1;
        }
        let fixedDistance = distance;
        if (fixedDistance > outer - nodeRadius) {
          fixedDistance = outer - nodeRadius;
        }
        if (fixedDistance < inner + nodeRadius) {
          fixedDistance = inner + nodeRadius;
        }
        d.x = centre + (dx / distance) * fixedDistance;
        d.y = centre + (dy / distance) * fixedDistance;
      }
    }

    link
      .attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      });

    nodeGroup.attr("transform", function (d) {
      return "translate(" + d.x + ", " + d.y + ")";
    });
  });

  return container.node();
}
;

const _30 = (md) => {
return (
md`### Question 1.2 Who has she collaborated with and directly or indirectly influenced?`
)
};

const _33 = function treeChart(q1b_collab_network2,d3)
{
  const width = 900;
  const colors = {
    collaborator: "#0394fc",
    direct: "#03fc45",
    indirect: "#fc8403",
    sailor: "#89CFF0"
  };

  let colNodes = q1b_collab_network2.nodes;
  let colLinks = q1b_collab_network2.links;

  // get id for object or string
  function getId(ref) {
    if (typeof ref === "object" && ref !== null) {
      return String(ref.id);
    }
    return String(ref);
  }

  let sailorId = "17255";

  let categories = new Set(["collaborator", "direct", "indirect"]);
  let activeSearchTerm = "";
  let container = d3
    .create("div")
    .style("font-family", "sans-serif")
    .style("width", width + "px")
    .style("margin", "0 auto");
  container
    .append("div")
    .style("text-align", "center")
    .style("font-size", "24px")
    .style("color", "#333")
    .style("margin-bottom", "20px")
    .text("Sailor Shift's Collaborations, Direct, and Indirect Influences");

  let controls = container
    .append("div")
    .style("display", "flex")
    .style("justify-content", "space-between")
    .style("align-items", "center")
    .style("margin-bottom", "20px")
    .style("background", "#f9f9f9")
    .style("padding", "15px")
    .style("border-radius", "12px");

  // search bar
  let searchBar = container
    .append("div")
    .style("margin", "10px auto")
    .style("width", "fit-content")
    .style("background", "white")
    .style("padding", "6px 16px")
    .style("border-radius", "20px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("display", "flex")
    .style("align-items", "center")
    .style("border", "1px solid #ddd");

  let searchInput = searchBar
    .append("input")
    .attr("type", "text")
    .attr("placeholder", "Search for an artist")
    .style("border", "none")
    .style("outline", "none")
    .style("font-size", "14px")
    .style("width", "180px");

  searchInput.on("input", function () {
    searchBar = this.value.trim().toLowerCase();
    // updateFilters();
  });

  let filter = controls
    .append("div")
    .style("display", "flex")
    .style("gap", "20px");

  let filterItems = {};
  let categoryNames = Object.keys(colors);

  for (let i = 0; i < categoryNames.length; i++) {
    let cat = categoryNames[i];
    let color = colors[cat];

    if (cat === "sailor") {
      continue;
    }

    let filterItem = filter
      .append("div")
      .style("cursor", "pointer")
      .style("display", "flex")
      .style("align-items", "center")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("transition", "opacity 0.2s");

    filterItem.on("click", function () {
      if (categories.has(cat) && categories.size === 1) {
        categories = new Set(["collaborator", "direct", "indirect"]);
      } else {
        categories = new Set([cat]);
      }
      updateFilterUI();
      render();
    });

    filterItem
      .append("div")
      .style("width", "14px")
      .style("height", "14px")
      .style("background", color)
      .style("border-radius", "4px")
      .style("margin-right", "8px");

    let capitalisedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    filterItem.append("span").text(capitalisedCat);

    filterItems[cat] = filterItem;
  }

  function updateFilterUI() {
    let categoryKeys = Object.keys(filterItems);
    for (let i = 0; i < categories.length; i++) {
      let cat = categories[i];

      if (categories.has(cat)) {
        filterItems[cat].style("opacity", 1);
      } else {
        filterItems[cat].style("opacity", 0.2);
      }
    }
  }

  let chartContainer = container.append("div");

  let detailsContainer = container
    .append("div")
    .style("display", "none")
    .style("background", "#fdfdfd")
    .style("padding", "30px")
    .style("border", "1px solid #eee")
    .style("border-radius", "12px")
    .style("min-height", "400px")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.05)");

  let backButton = detailsContainer
    .append("button")
    .text("← Back to Graph")
    .style("padding", "10px 18px")
    .style("margin-bottom", "20px")
    .style("background", "#333")
    .style("color", "#fff")
    .style("border", "none")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("cursor", "pointer")
    .on("click", function () {
      detailsContainer.style("display", "none");
      controls.style("display", "flex");
      chartContainer.style("display", "block");
    });
  let detailsContent = detailsContainer.append("div");

  function render() {
    chartContainer.selectAll("*").remove();

    let nodeMap = new Map();
    for (let i = 0; i < colNodes.length; i++) {
      let node = colNodes[i];
      nodeMap.set(getId(node), node);
    }

    let creationTypes = [
      "PerformerOf",
      "ComposerOf",
      "LyricistOf",
      "ProducerOf",
      "MemberOf"
    ];

    let influenceTypes = [
      "InterpolatesFrom",
      "DirectlySamples",
      "InStyleOf",
      "CoverOf",
      "LyricalReferenceTo"
    ];

    function getName(id) {
      let node = nodeMap.get(id);
      if (node) {
        if (node.name) {
          return node.name;
        }
        if (node.stage_name) {
          return node.stage_name;
        }
        if (node.title) {
          return node.title;
        }
      }
      return "Unknown";
    }

    function isArtist(id) {
      let node = nodeMap.get(id);
      if (node) {
        return (
          node["Node Type"] === "Person" || node["Node Type"] === "MusicalGroup"
        );
      }
      return false;
    }

    let songToCreators = new Map();
    let creatorToSongs = new Map();

    for (let i = 0; i < colLinks.length; i++) {
      let link = colLinks[i];
      let edgeType = link["Edge Type"];

      if (creationTypes.includes(edgeType)) {
        let sourceId = getId(link.source);
        let targetId = getId(link.target);

        if (!songToCreators.has(targetId)) {
          songToCreators.set(targetId, new Set());
        }
        songToCreators.get(targetId).add(sourceId);

        if (!creatorToSongs.has(sourceId)) {
          creatorToSongs.set(sourceId, new Set());
        }
        creatorToSongs.get(sourceId).add(targetId);
      }
    }

    function getCreators(id) {
      if (isArtist(id)) {
        return new Set([id]);
      } else {
        if (songToCreators.has(id)) {
          return songToCreators.get(id);
        }
        return new Set();
      }
    }

    function getWorks(id) {
      let works = new Set();

      if (creatorToSongs.has(id)) {
        let songs = creatorToSongs.get(id);
        songs.forEach(function (song) {
          works.add(song);
        });
      }
      works.add(id);
      return works;
    }

    let collabs = new Set();
    let sailorWorks = getWorks(sailorId);
    sailorWorks.forEach(function (work) {
      if (!isArtist(work)) {
        let creators = getCreators(work);

        creators.forEach(function (creator) {
          if (creator !== sailorId) {
            collabs.add(creator);
          }
        });
      }
    });

    let directs = new Set();
    let directWorks = new Set();

    for (let i = 0; i < colLinks.length; i++) {
      let link = colLinks[i];
      let edgeType = link["Edge Type"];

      if (influenceTypes.includes(edgeType)) {
        let targetId = getId(link.target);
        let sourceId = getId(link.source);

        if (sailorWorks.has(targetId)) {
          directWorks.add(sourceId);
          let creators = getCreators(sourceId);
          creators.forEach(function (creator) {
            if (creator !== sailorId) {
              directs.add(creator);
            }
          });
        }
      }
    }

    directs.forEach(function (artistId) {
      let works = getWorks(artistId);
      works.forEach(function (work) {
        directWorks.add(work);
      });
    });

    sailorWorks.forEach(function (work) {
      directWorks.delete(work);
    });

    let indirectsMap = new Map();

    for (let i = 0; i < colLinks.length; i++) {
      let link = colLinks[i];
      let edgeType = link["Edge Type"];

      if (influenceTypes.includes(edgeType)) {
        let sourceId = getId(link.source);
        let targetId = getId(link.target);

        if (directWorks.has(targetId)) {
          let viaArtists = getCreators(targetId);
          let affectedArtists = getCreators(sourceId);

          affectedArtists.forEach(function (creator) {
            if (creator !== sailorId) {
              let myName = getName(creator);
              let validViaAdded = false;

              if (!indirectsMap.has(creator)) {
                indirectsMap.set(creator, new Set());
              }

              viaArtists.forEach(function (via) {
                let viaName = getName(via);
                if (via !== sailorId && viaName !== myName) {
                  indirectsMap.get(creator).add(viaName);
                  validViaAdded = true;
                }
              });

              if (
                !validViaAdded &&
                targetId !== sailorId &&
                getName(targetId) !== myName
              ) {
                indirectsMap.get(creator).add(getName(targetId));
              }
            }
          });
        }
      }
    }

    let indirectKeys = Array.from(indirectsMap.keys());
    for (let i = 0; i < indirectKeys.length; i++) {
      let key = indirectKeys[i];

      if (indirectsMap.get(key).size === 0) {
        indirectsMap.delete(key);
      }
    }

    function buildNodes(idSet, categoryName) {
      let result = [];
      let ids = Array.from(idSet);
      for (let i = 0; i < ids.length; i++) {
        result.push({
          id: ids[i],
          name: getName(ids[i]),
          category: categoryName
        });
      }
      return result;
    }

    let children = [];

    if (categories.has("collaborator")) {
      children.push({
        name: "Collaborators",
        category: "collaborator",
        children: buildNodes(collabs, "collaborator")
      });
    }

    if (categories.has("direct")) {
      children.push({
        name: "Direct Influences",
        category: "direct",
        children: buildNodes(directs, "direct")
      });
    }

    if (categories.has("indirect")) {
      let indies = [];
      let indirectEntries = Array.from(indirectsMap.entries());

      for (let i = 0; i < indirectEntries.length; i++) {
        let id = indirectEntries[i][0];
        let influencerSet = indirectEntries[i][1];

        let validInfluencers = [];

        let influencerArray = Array.from(influencerSet);
        for (let j = 0; j < influencerArray.length; j++) {
          if (influencerArray[j]) {
            validInfluencers.push(influencerArray[j]);
          }
        }

        indies.push({
          id: id,
          name: getName(id),
          category: "indirect",
          influencerText: validInfluencers.join(", ")
        });
      }

      let indirectChildren;
      if (indies.length > 0) {
        indirectChildren = indies;
      } else {
        indirectChildren = [
          {
            name: "No 2nd Generation Found",
            isDummy: true,
            category: "indirect"
          }
        ];
      }

      children.push({
        name: "Indirect Influences",
        category: "indirect",
        children: indirectChildren
      });
    }

    let data = {
      name: "Sailor Shift",
      category: "sailor",
      children: children
    };

    let root = d3.hierarchy(data);

    let dx = 24;
    let dy = width / (root.height + 1.8);

    let tree = d3.tree().nodeSize([dx, dy]);

    root.sort(function (a, b) {
      if (a.data.name < b.data.name) {
        return -1;
      }
      if (a.data.name > b.data.name) {
        return 1;
      }
      return 0;
    });

    tree(root);

    let x0 = Infinity;
    let x1 = -x0;
    root.each(function (d) {
      if (d.x > x1) {
        x1 = d.x;
      }
      if (d.x < x0) {
        x0 = d.x;
      }
    });

    let height = x1 - x0 + dx * 6;

    let svg = chartContainer
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-dy / 2.5, x0 - dx * 2, width, height])
      .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;");

    let gLink = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

    let gNode = svg.append("g");

    let links = gLink
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("stroke", function (d) {
        if (colors[d.target.data.category]) {
          return colors[d.target.data.category];
        }
        return "#ccc";
      })
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x(function (d) {
            return d.y;
          })
          .y(function (d) {
            return d.x;
          })
      );

    let nodes = gNode
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", function (d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    nodes
      .append("circle")
      .attr("fill", function (d) {
        if (d.data.isDummy) {
          return "none";
        }
        if (colors[d.data.category]) {
          return colors[d.data.category];
        }
        return "#555";
      })
      .attr("stroke", function (d) {
        if (d.data.isDummy) {
          return "#ccc";
        }
        return "none";
      })
      .attr("r", function (d) {
        if (d.depth === 0) {
          return 6;
        }
        return 4;
      });

    let labels = nodes
      .append("text")
      .attr("x", function (d) {
        if (d.children) {
          return -10;
        }
        return 10;
      })
      .attr("text-anchor", function (d) {
        if (d.children) {
          return "end";
        }
        return "start";
      })
      .attr("font-size", function (d) {
        if (d.depth === 0) {
          return "14px";
        }
        return "11px";
      })
      .style("fill", function (d) {
        if (d.data.isDummy) {
          return "#aaa";
        }
        return "#333";
      });

    labels
      .append("tspan")
      .attr("dy", function (d) {
        if (d.data.influencerText) {
          return "-0.2em";
        }
        return "0.31em";
      })
      .text(function (d) {
        return d.data.name;
      })
      .attr("font-weight", function (d) {
        if (d.depth < 2) {
          return "bold";
        }
        return "normal";
      });

    labels
      .filter(function (d) {
        return d.data.influencerText && d.data.influencerText.length > 0;
      })
      .append("tspan")
      .attr("x", function (d) {
        if (d.children) {
          return -10;
        }
        return 10;
      })
      .attr("dy", "1.3em")
      .text(function (d) {
        return "(via " + d.data.influencerText + ")";
      })
      .style("opacity", 0.6)
      .style("font-size", "0.9em")
      .style("font-style", "italic");
    labels
      .clone(true)
      .lower()
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .selectAll("tspan")
      .style("fill", "white");

    function applyHighlight(searchTerm) {
      if (!searchTerm) {
        nodes.transition().duration(200).style("opacity", 1);
        links.transition().duration(200).style("opacity", 0.4);
        svg
          .selectAll("text")
          .transition()
          .duration(200)
          .style("fill", function (n) {
            if (n.data.isDummy) {
              return "#aaa";
            }
            return "#333";
          })
          .style("opacity", 1);
        return;
      }

      function isMatch(d) {
        let matchName = d.data.name.toLowerCase().includes(searchTerm);
        let matchVia = false;
        if (d.data.influencerText) {
          matchVia = d.data.influencerText.toLowerCase().includes(searchTerm);
        }
        return matchName || matchVia;
      }

      let descendants = root.descendants();
      let matches = [];
      for (let i = 0; i < descendants.length; i++) {
        if (isMatch(descendants[i])) {
          matches.push(descendants[i]);
        }
      }

      if (matches.length > 0) {
        let activePathIds = new Set();
        for (let i = 0; i < matches.length; i++) {
          let matchAncestors = matches[i].ancestors();
          for (let j = 0; j < matchAncestors.length; j++) {
            activePathIds.add(matchAncestors[j]);
          }
        }

        nodes.style("opacity", function (d) {
          if (activePathIds.has(d) || isMatch(d)) {
            return 1;
          }
          return 0.1;
        });

        links.style("opacity", function (d) {
          if (activePathIds.has(d.target) && activePathIds.has(d.source)) {
            return 1;
          }
          return 0.05;
        });

        svg
          .selectAll("text")
          .style("fill", function (n) {
            if (isMatch(n)) {
              return "#000";
            }
            if (activePathIds.has(n)) {
              return "#555";
            }
            return "#ccc";
          })
          .style("opacity", function (n) {
            if (activePathIds.has(n) || isMatch(n)) {
              return 1;
            }
            return 0.3;
          });
      } else {
        nodes.style("opacity", 0.1);
        links.style("opacity", 0.05);
        svg.selectAll("text").style("fill", "#ccc").style("opacity", 0.3);
      }
    }

    if (activeSearchTerm) {
      applyHighlight(activeSearchTerm);
    }

    nodes.style("cursor", "pointer");

    nodes.on("click", function (event, d) {
      if (d.data.category === "sailor" || d.depth < 2 || d.data.isDummy) {
        return;
      }

      let clickedId = d.data.id;
      let cat = d.data.category;
      let artistName = d.data.name;

      controls.style("display", "none");
      chartContainer.style("display", "none");
      detailsContainer.style("display", "block");
      detailsContent.selectAll("*").remove();
      detailsContent
        .append("h2")
        .style("margin-top", "0")
        .style("color", colors[cat])
        .text(artistName);

      if (cat === "collaborator") {
        detailsContent
          .append("h3")
          .style("color", "#555")
          .text("Collaborated with Sailor Shift on:");

        let sWorksArray = Array.from(getWorks(sailorId));
        let cWorks = getWorks(clickedId);
        let sharedWorks = [];

        for (let i = 0; i < sWorksArray.length; i++) {
          let workId = sWorksArray[i];
          if (cWorks.has(workId) && !isArtist(workId)) {
            sharedWorks.push(getName(workId));
          }
        }

        if (sharedWorks.length > 0) {
          let ul = detailsContent
            .append("ul")
            .style("font-size", "16px")
            .style("line-height", "1.6");
          for (let i = 0; i < sharedWorks.length; i++) {
            ul.append("li").text(sharedWorks[i]);
          }
        } else {
          detailsContent
            .append("p")
            .text("No specific shared songs found in dataset.");
        }
      } else if (cat === "direct") {
        detailsContent
          .append("h3")
          .style("color", "#555")
          .text("Directly Influenced:");

        let influenceList = [];
        for (let i = 0; i < colLinks.length; i++) {
          let link = colLinks[i];
          if (influenceTypes.includes(link["Edge Type"])) {
            let targetCreators = getCreators(getId(link.target));
            let sourceCreators = getCreators(getId(link.source));

            if (targetCreators.has(sailorId) && sourceCreators.has(clickedId)) {
              let sourceName = getName(getId(link.source));
              let targetName = getName(getId(link.target));
              let typeText = link["Edge Type"];

              influenceList.push(
                `Their work "${sourceName}" influenced Sailor's "${targetName}" (${typeText})`
              );
            }
          }
        }

        if (influenceList.length > 0) {
          let ul = detailsContent
            .append("ul")
            .style("font-size", "16px")
            .style("line-height", "1.6");
          for (let i = 0; i < influenceList.length; i++) {
            ul.append("li").html(influenceList[i]);
          }
        } else {
          detailsContent.append("p").text("Specific tracks not found.");
        }
      } else if (cat === "indirect") {
        detailsContent
          .append("h3")
          .style("color", "#555")
          .text("Indirectly Influenced Sailor Shift:");
        detailsContent
          .append("p")
          .style("font-size", "16px")
          .text(
            "This artist's work influenced Sailor Shift indirectly through other artists in the network."
          );

        if (d.data.influencerText) {
          detailsContent
            .append("p")
            .style("font-size", "16px")
            .html(`<strong>Via:</strong> ${d.data.influencerText}`);
        }
      }
    });

    nodes.on("mouseover", function (event, d) {
      if (activeSearchTerm !== "") {
        return;
      }

      let ancestorsArray = d.ancestors();
      let ancestors = new Set(ancestorsArray);

      nodes.style("opacity", function (n) {
        if (ancestors.has(n)) {
          return 1;
        }
        return 0.1;
      });

      links.style("opacity", function (l) {
        if (ancestors.has(l.target)) {
          return 1;
        }
        return 0.05;
      });
    });

    nodes.on("mouseout", function () {
      if (activeSearchTerm !== "") {
        return;
      }
      nodes.style("opacity", 1);
      links.style("opacity", 0.4);
    });

    searchInput.on("input", function () {
      activeSearchTerm = this.value.toLowerCase().trim();

      if (activeSearchTerm !== "") {
        let nodeValues = Array.from(nodeMap.values());
        let stringMatches = [];

        for (let i = 0; i < nodeValues.length; i++) {
          let n = nodeValues[i];
          let nameString = n.name || n.stage_name || "";

          if (nameString.toLowerCase().includes(activeSearchTerm)) {
            stringMatches.push(n);
          }
        }

        if (stringMatches.length > 0) {
          let neededCategories = new Set();

          for (let i = 0; i < stringMatches.length; i++) {
            let mId = getId(stringMatches[i]);
            if (collabs.has(mId)) {
              neededCategories.add("collaborator");
            }
            if (directs.has(mId)) {
              neededCategories.add("direct");
            }
            if (indirectsMap.has(mId)) {
              neededCategories.add("indirect");
            }
          }

          let needsReset = false;
          let neededArray = Array.from(neededCategories);
          for (let i = 0; i < neededArray.length; i++) {
            let cat = neededArray[i];
            if (!categories.has(cat)) {
              needsReset = true;
              break;
            }
          }

          if (needsReset) {
            categories = new Set(["collaborator", "direct", "indirect"]);
            updateFilterUI();
            render();
            return;
          }
        }
      }
      applyHighlight(activeSearchTerm);
    });
  }

  updateFilterUI();
  render();

  return container.node();
}
;

const _35 = (md) => {
return (
md`### Question 1.3 How has she influenced collaborators of the broader Oceanus Folk community?`
)
};

const _37 = function heatmap(q1c_oceanus_community2,d3)
{
  let width = 950;
  let margin = { top: 50, right: 180, bottom: 50, left: 180 };

  let rawNodes = q1c_oceanus_community2.nodes;
  let rawLinks = q1c_oceanus_community2.links;

  function getId(ref) {
    if (typeof ref === "object" && ref !== null) {
      return String(ref.id);
    }
    return String(ref);
  }

  let sailorId = "17255";

  let nodeMap = new Map();
  for (let i = 0; i < rawNodes.length; i++) {
    let node = rawNodes[i];
    nodeMap.set(getId(node), node);
  }

  let roleMapping = {
    ProducerOf: "Produced",
    ComposerOf: "Composed",
    LyricistOf: "Wrote Lyrics",
    PerformerOf: "Performed",
    MemberOf: "Band Member"
  };
  let roles = [
    "Produced",
    "Composed",
    "Wrote Lyrics",
    "Performed",
    "Band Member"
  ];

  let artistStats = new Map();
  let sailorProjects = [];

  for (let i = 0; i < rawLinks.length; i++) {
    let link = rawLinks[i];
    let edgeType = link["Edge Type"];
    if (getId(link.source) === sailorId && roleMapping[edgeType]) {
      sailorProjects.push(link);
    }
  }

  for (let i = 0; i < sailorProjects.length; i++) {
    let sp = sailorProjects[i];
    let projectId = getId(sp.target);
    let sailorRole = roleMapping[sp["Edge Type"]];

    let workWith = [];
    for (let j = 0; j < rawLinks.length; j++) {
      let link = rawLinks[j];
      if (
        getId(link.target) === projectId &&
        getId(link.source) !== sailorId &&
        roleMapping[link["Edge Type"]]
      ) {
        workWith.push(link);
      }
    }

    for (let j = 0; j < workWith.length; j++) {
      let cw = workWith[j];
      let collabNode = nodeMap.get(getId(cw.source));

      if (
        collabNode &&
        (collabNode["Node Type"] === "Person" ||
          collabNode["Node Type"] === "MusicalGroup")
      ) {
        let collabName = collabNode.name || collabNode.stage_name || "Unknown";

        if (!artistStats.has(collabName)) {
          artistStats.set(collabName, {
            Produced: 0,
            Composed: 0,
            "Wrote Lyrics": 0,
            Performed: 0,
            "Band Member": 0,
            total: 0
          });
        }

        let stats = artistStats.get(collabName);
        stats[sailorRole] += 1;
        stats.total += 1;
      }
    }
  }

  let matrixData = [];
  let artistTotals = [];
  let maxCount = 0;

  let artistEntries = Array.from(artistStats.entries());
  for (let i = 0; i < artistEntries.length; i++) {
    let artist = artistEntries[i][0];
    let stats = artistEntries[i][1];

    artistTotals.push({ artist: artist, total: stats.total });

    for (let j = 0; j < roles.length; j++) {
      let role = roles[j];
      let count = stats[role];
      if (count > maxCount) {
        maxCount = count;
      }
      matrixData.push({ artist: artist, role: role, count: count });
    }
  }

  artistTotals.sort(function (a, b) {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    if (a.artist < b.artist) return -1;
    if (a.artist > b.artist) return 1;
    return 0;
  });

  let currentArtists = [];
  for (let i = 0; i < artistTotals.length; i++) {
    currentArtists.push(artistTotals[i].artist);
  }

  let cellSize = 20;
  let height = currentArtists.length * cellSize + margin.top + margin.bottom;

  let container = d3
    .create("div")
    .style("font-family", "sans-serif")
    .style("position", "relative")
    .style("background", "white")
    .style("padding", "20px")
    .style("border-radius", "8px")
    .style("width", width + "px");

  container
    .append("div")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333")
    .style("text-align", "center")
    .text("Sailor Shift's Influence on the Oceanus Folk Community");

  let controls = container
    .append("div")
    .style("margin-bottom", "20px")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  controls
    .append("label")
    .text("Sort Artists:")
    .style("font-weight", "bold")
    .style("font-size", "14px");

  let select = controls
    .append("select")
    .style("padding", "6px 12px")
    .style("border-radius", "6px")
    .style("border", "1px solid #ccc")
    .style("font-size", "14px")
    .style("cursor", "pointer");

  select
    .append("option")
    .attr("value", "total")
    .text("By Total Collaborations (High to Low)");
  select.append("option").attr("value", "alpha").text("Alphabetically (A-Z)");

  let tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(0, 0, 0, 0.85)")
    .style("color", "white")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "10");

  let svg = container
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto;");

  let g = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let x = d3
    .scaleBand()
    .domain(roles)
    .range([0, width - margin.left - margin.right])
    .padding(0);

  let y = d3
    .scaleBand()
    .domain(currentArtists)
    .range([0, currentArtists.length * cellSize])
    .padding(0);

  let colour = d3
    .scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateYlOrRd);

  g.append("g")
    .call(d3.axisTop(x).tickSize(0))
    .call(function (g) {
      g.select(".domain").remove();
    })
    .selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .attr("dy", "-10px");

  let yAxisGroup = g
    .append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .call(function (g) {
      g.select(".domain").remove();
    });

  yAxisGroup
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#555")
    .attr("dx", "-10px");

  let cells = g
    .selectAll(".cell")
    .data(matrixData, function (d) {
      return d.artist + ":" + d.role;
    })
    .join("rect")
    .attr("class", "cell")
    .attr("x", function (d) {
      return x(d.role);
    })
    .attr("y", function (d) {
      return y(d.artist);
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", function (d) {
      if (d.count === 0) {
        return "#f8f9fa";
      } else {
        return colour(d.count);
      }
    })
    .attr("stroke", "#e9ecef")
    .attr("stroke-width", 1)
    .attr("rx", 0)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
      tooltip
        .style("visibility", "visible")
        .html(
          "<strong>" +
            d.artist +
            "</strong><br/>Role: " +
            d.role +
            "<br/>Count: " +
            d.count
        );
    })
    .on("mousemove", function (event) {
      let pointer = d3.pointer(event, container.node());
      let ptrX = pointer[0];
      let ptrY = pointer[1];
      tooltip.style("top", ptrY - 5 + "px").style("left", ptrX + 40 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("stroke", "#e9ecef").attr("stroke-width", 1);
      tooltip.style("visibility", "hidden");
    });

  let cellTexts = g
    .selectAll(".cell-text")
    .data(matrixData, function (d) {
      return d.artist + ":" + d.role;
    })
    .join("text")
    .attr("class", "cell-text")
    .attr("x", function (d) {
      return x(d.role) + x.bandwidth() / 2;
    })
    .attr("y", function (d) {
      return y(d.artist) + y.bandwidth() / 2;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", function (d) {
      if (d.count > maxCount * 0.4) {
        return "#fff";
      } else {
        return "#333";
      }
    })
    .style("pointer-events", "none")
    .text(function (d) {
      if (d.count > 0) {
        return d.count;
      } else {
        return "";
      }
    });

  select.on("change", function () {
    let mode = this.value;

    if (mode === "total") {
      artistTotals.sort(function (a, b) {
        if (b.total !== a.total) return b.total - a.total;
        if (a.artist < b.artist) return -1;
        if (a.artist > b.artist) return 1;
        return 0;
      });
    } else {
      artistTotals.sort(function (a, b) {
        if (a.artist < b.artist) return -1;
        if (a.artist > b.artist) return 1;
        return 0;
      });
    }

    currentArtists = [];
    for (let i = 0; i < artistTotals.length; i++) {
      currentArtists.push(artistTotals[i].artist);
    }

    y.domain(currentArtists);

    let t = svg.transition().duration(750);

    cells.transition(t).attr("y", function (d) {
      return y(d.artist);
    });
    cellTexts.transition(t).attr("y", function (d) {
      return y(d.artist) + y.bandwidth() / 2;
    });

    yAxisGroup
      .transition(t)
      .call(d3.axisLeft(y).tickSize(0))
      .call(function (g) {
        g.select(".domain").remove();
      })
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#555")
      .attr("dx", "-10px");
  });

  return container.node();
}
;

const _39 = (md) => {
return (
md`## Written Report for Question 1`
)
};

const _41 = (md) => {
return (
md`### Data Analysis: Pre-processing and Analysis
#### Data Checking and Error Handling
To ensure data integrity, a set of '_filter_' queries were used to identify and remove any issues within the raw data, such as nodes having valid names and genres, conflicting data (projects with release dates before written dates), and no orphan nodes. I removed 'self-looping' nodes and duplicate links as they provide no relational insight. However, instead of deleting incomplete records, nodes were retained with missing release dates to preserve collaboration structure. I implemented a fallback mechanism using D3 to prevent the radial timeline algorithm from breaking in the first subquestion. Additionally, a custom '_getId()_' function allowed different data types to be processed in a uniform format.

#### Data Transformations
The raw data was transformed by creating three tailored JSON files, one for each subquestion. I used '_dplyr_' to isolate specific subsets, for example filtering specifically for the "Oceanus Folk" genre, which was necessary for the third subquestion. This drastically reduced file sizes, ensuring the D3 physics simulations created remained fast and responsive. 

#### Network Analysis
Subquestion two demanded a complex multi-generation influence structure (direct, indirect influences). By using '_dplyr_', I traced paths across the network to identify Sailor Shift's direct projects, and projects that influenced those. This was essential to classify the difference between direct and indirect influences the subquestion asked for. 

Finally, I calculated each artist's degree (total collaborations and influence links), which was necessary for subquestion 1. The data could be mapped to the radius of each node, allowing it to shift from a flat list of names into an understandable hierarchy with most highly connected artists being larger within the graph.


### Visualisation and Interaction Design
To create interactive visualisastions for the three subquestions, I implemented custom D3.js layouts. This was done through an iterative process, starting with going through Observable's D3 gallery and prototyping different chart types. After evaluating the initial prototypes, I selected the most robust foundational layouts and tailored them ensuring the adaptations adhered to Mackinlay's principles of graphical representations of relational information.

#### Question 1.1: Radial Graph
To analyse influence over time, a radial graph avoids the visual clutter of a standard node-link graph.

To adhere to Mackinlay's principle of effectiveness, distance of nodes from the centre represents the temporal dimension (project release decade), because spatial position is the highest ranking visual channel for quantitative and ordinal data. Additionally, an artist's network degree (magnitude) is represented by a node's area which, according to Colin Ware, size is a strong pre-attentive feature to instantly perceive information. And finally, nominal data (influence type) is represented by categorical hues.

To ensure scalability, I implemented a hover interaction that adheres to Gestalt's principle of Figure/Ground. Hovering over an artist dims unrelated nodes to the "ground" whilst bringing the influence node to the foreground as the "figure". Moreover, to reduce cognitive load, I added  filtering options: filtering by influence type, release decade, magnitude, or a mixture of the three. They explore selective attention (Colin Ware, 2008), allowing users to extract targeted information while the "ground" nodes maintain macro-context. Finally, a name searching function was implemented, highlighting matching artists while fading out the rest, utilising pre-attentive visual contrast to guide the user's eye directly to the requested data point instantly.

#### Question 1.2: Hierarchical Tidy Tree
In order to separate and display multi-generational influence (collaborators, direct, and indirect influences), a hierarchical tidy tree was used, to display parent-child links. It relies heavily on Gestalt's principle of connectedness (drawn paths) representing generation links, and the principle of similarity (categorical colours) representing groups of nodes.

Screen space is a limiting factor, so I created a "details-on-demand" interaction (Shneiderman, 1996). Clicking a node hides the tree and transitions to a textual interface detailing shared discography with Sailor Shift, to prevent text occlusion on the main canvas.

I implemented a highlighting interaction where hovering over any node dynamically increases the opacity of that artist and their path to Sailor Shift, while fading out unrelated branches into the background, again utilising the Gestalt principle of Figure/Ground.

Finally, to aid discoverability and reduce cognitive load, I added the same name search function, as well as a categorical filtering legend. Toggling a category of influence transforms the graph into its corresponding subtree, displaying only the category selected. This directly relates to Colin Ware's (2008) concept of selective attention, as removing unselected categories eliminates visual clutter and allows the user to process specific structured subsets.



#### Question 1.3: Matrix Heatmap
An adjacency matrix (heatmap) is highly effective for visualising the dense Oceanus Folk network, as it provides a structured grid that is easily digestible and reduces visual clutter. 

Collaboration frequency is encoded using a sequential colour scale (light yellow to dark red). According to ideas on visual perception (Colin Ware, 2004), colour brightness is an effective pre-attentive visual channel for estimating magnitude. The user can immediately detect high volume relationships without needing to consciously process raw numerical values.

To ensure the matrix scales well, artists can be sorted by their total collaboration frequency, reinforcing Gestalt's principle of proximity, allowing users to instantly group major collaborative communities. To support Shneiderman's "details-on-demand", hovering over any cell displays a tooltip containing the artist's name, collaboration type, and collaboration count, while simultaneously applying a stroke highlight around the cell, again utilising the Gestalt principle of Figure/Ground.


### Written Results to Analysis Questions
#### Question 1.1: Influence Over Time
The radial graph shows that Sailor Shift draws her largest inspiration from the 2010s, demonstrated by the dense cluster of nodes in that era ring. The largest nodes (mangitude 3) show her primary influencers are Shannon Harvey, Joshua Taylor, and Urszula Stochmal. Additionally, the most dominant form of influence is displayed through the green nodes, representing "_InStyleOf_".

#### Question 1.2: Collaborations and Influences
The hierarchical tidy tree displays Sailor Shift's network is mostly weighted towards collaborations, some including artists such as, Arlo Sterling, Ethan Clarke, and Olivia Carter, creating the most densely populated subtree. It also displays her direct and indirect influences, with the indirect influences branch only consisting of two artists, Julia Carter and Selkie's Hollow. 

#### Question 1.3: Influencing the Broader Oceanus Folk Community
The matrix heatmap can be sorted by total frequency, showing Beatrice Albright and Daniel O'Connell are Sailor Shift's primary collaborators within the Oceanus Folk community (6 influence counts). Looking at column density, contributions are heavily clustered in the "Wrote Lyrics" category, represented by both the darkest coloured cells and most coloured cells. The empty "Produced" and "Composed" columns demonstrates she has never branched into producing or composing music within the Oceanus Folk community. 

### Development Process Reflection
Designing these visualisations presented three main challenges. First, translating the broad data description into three tailored JSON subsets was technically demanding, requiring unique _dplyr_ pipelines as each subquestion needed different relational logic to extract the correct data. Second, prototyping within Observable required testing multiple gallery templates, followed by adapting the chosen base layouts to ensure they perfectly suited each tasks. Third, balancing information density was challenging, as I had to choose which interactions would fit each visualisation, while both upholding design principles and not overwhelming the user. 

For future adaptations, I would like to implement multiple linked visualisations, such as brushing and linking for each subquestion, allowing for even deeper layered exploratory analysis.`
)
};

const _132 = (md) => {
return (
md`# Question 2 `
)
};

const _158 = function d3(require){return(
require("d3@7", "d3-sankey@0.12")
)};

const _150 = function oceanus_influence_by_year(FileAttachment){return(
FileAttachment("q2a_oceanus_influence_by_year.json").json()
)};

const _152 = function oceanus_releases_by_year(FileAttachment){return(
FileAttachment("q2a_oceanus_releases_by_year.json").json()
)};

const _154 = function artists_influenced_by_oceanus(FileAttachment){return(
FileAttachment("q2b_artists_influenced_by_oceanus (1).json").json()
)};

const _156 = function genres_influenced_by_oceanus(FileAttachment){return(
FileAttachment("q2b_genres_influenced_by_oceanus.json").json()
)};

const _160 = function oceanus_flows(FileAttachment){return(
FileAttachment("q2c_oceanus_flows.json").json()
)};

const _162 = function inspiration_over_time(FileAttachment){return(
FileAttachment("q2c_inspiration_over_time-1 (2).json").json()
)};

const _164 = function oceanus_folk_notoriety(FileAttachment){return(
FileAttachment("q2c_of_notoriety_by_year-1.json").json()
)};

const _169 = (md) => {
return (
md`# Oceanus Folk influence over time`
)
};

const _176 = function q2a_data(oceanus_influence_by_year,oceanus_releases_by_year){return(
[
  ...oceanus_influence_by_year.map((d) => ({
    year: +d.year,
    value: +d.influence_count,
    series: "Influenced non-Oceanus works"
  })),

  ...oceanus_releases_by_year.map((d) => ({
    year: +d.year,
    value: +d.n,
    series: "Oceanus Folk releases"
  }))
]
)};

const _178 = function viewof$showMovingAverage(Inputs){return(
Inputs.checkbox(["Show 5-year moving average"], {
  value: ["Show 5-year moving average"],
  label: "Trend line"
})
)};

const _180 = function mutable$selectedYear(){return(
null
)};

const _182 = function movingAverage(d3){return(
(data, k = 5) => {
  const grouped = d3.group(data, (d) => d.series);
  const output = [];

  for (const [series, values] of grouped) {
    const sorted = values.slice().sort((a, b) => d3.ascending(a.year, b.year));

    for (let i = 0; i < sorted.length; i++) {
      const start = Math.max(0, i - Math.floor(k / 2));
      const end = Math.min(sorted.length, i + Math.floor(k / 2) + 1);
      const window = sorted.slice(start, end);

      output.push({
        year: sorted[i].year,
        value: d3.mean(window, (d) => d.value),
        series: `${series} — 5-year moving average`
      });
    }
  }

  return output;
}
)};

const _184 = function viewof$visibleSeries(Inputs){return(
Inputs.checkbox(
  ["Influenced non-Oceanus works", "Oceanus Folk releases"],
  {
    value: ["Influenced non-Oceanus works", "Oceanus Folk releases"],
    label: "Show series"
  }
)
)};

const _186 = function q2a_chart(q2a_data,visibleSeries,d3)
{
  const data = q2a_data
    .filter((d) => visibleSeries.includes(d.series))
    .map((d) => ({
      year: +d.year,
      date: new Date(+d.year, 0, 1),
      value: +d.value,
      series: d.series
    }))
    .sort((a, b) => d3.ascending(a.year, b.year));

  const width = 928;
  const height = 500;
  const marginTop = 55;
  const marginRight = 170;
  const marginBottom = 35;
  const marginLeft = 60;

  const sailorShiftRiseYear = 2028;

  const x = d3
    .scaleUtc()
    .domain(d3.extent(data, (d) => d.date))
    .range([marginLeft, width - marginRight]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .nice()
    .range([height - marginBottom, marginTop]);

  const color = d3
    .scaleOrdinal()
    .domain(d3.union(data.map((d) => d.series)))
    .range(d3.schemeTableau10);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr(
      "style",
      "max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;"
    );

  svg
    .append("text")
    .attr("x", marginLeft)
    .attr("y", 24)
    .attr("font-size", 16)
    .attr("font-weight", "bold")
    .text("Oceanus Folk influence over time");

  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .call((g) => g.select(".domain").remove());

  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", marginTop - 25)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Count")
    );

  svg
    .append("line")
    .attr("x1", x(new Date(sailorShiftRiseYear, 0, 1)))
    .attr("x2", x(new Date(sailorShiftRiseYear, 0, 1)))
    .attr("y1", marginTop)
    .attr("y2", height - marginBottom)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "4,4");

  svg
    .append("text")
    .attr("x", x(new Date(sailorShiftRiseYear, 0, 1)) + 8)
    .attr("y", marginTop + 12)
    .attr("fill", "gray")
    .attr("font-size", 10)
    .text("2028 Sailor Shift rise");

  const groups = d3.rollup(
    data,
    (v) => v,
    (d) => d.series
  );

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.value));

  function rollingMean(values, k = 5) {
    return values.map((d, i) => {
      const start = Math.max(0, i - Math.floor(k / 2));
      const end = Math.min(values.length, i + Math.floor(k / 2) + 1);
      const window = values.slice(start, end);
      return {
        ...d,
        value: d3.mean(window, (e) => e.value)
      };
    });
  }

  const path = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(groups)
    .join("path")
    .attr("stroke", ([series]) => color(series))
    .style("mix-blend-mode", "multiply")
    .attr("d", ([, values]) => line(values));

  svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,3")
    .selectAll("path")
    .data(groups)
    .join("path")
    .attr("stroke", ([series]) => color(series))
    .attr("d", ([, values]) => line(rollingMean(values, 5)));

  svg
    .append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.value))
    .attr("r", 2.2)
    .attr("fill", (d) => color(d.series));

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - marginRight + 25}, ${marginTop})`);

  const legendData = Array.from(groups.keys());

  legend
    .selectAll("rect")
    .data(legendData)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 18)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", (d) => color(d));

  legend
    .selectAll("text")
    .data(legendData)
    .join("text")
    .attr("x", 16)
    .attr("y", (d, i) => i * 18 + 9)
    .attr("font-size", 10)
    .text((d) => d);

  const points = data.map((d) => [x(d.date), y(d.value), d.series, d]);

  const dot = svg.append("g").attr("display", "none");

  dot.append("circle").attr("r", 3).attr("fill", "black");

  dot
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", -10)
    .attr("font-size", 11)
    .attr("font-weight", "bold");

  svg
    .on("pointerenter", pointerentered)
    .on("pointermove", pointermoved)
    .on("pointerleave", pointerleft)
    .on("touchstart", (event) => event.preventDefault());

  function pointermoved(event) {
    const [xm, ym] = d3.pointer(event);
    const i = d3.leastIndex(points, ([px, py]) => Math.hypot(px - xm, py - ym));
    const [px, py, series, d] = points[i];

    path
      .attr("stroke-opacity", ([s]) => (s === series ? 1 : 0.15))
      .filter(([s]) => s === series)
      .raise();

    dot.attr("transform", `translate(${px},${py})`);
    dot.select("text").text(`${series}: ${d.year}, ${d.value}`);

    svg.property("value", d).dispatch("input", { bubbles: true });
  }

  function pointerentered() {
    dot.attr("display", null);
  }

  function pointerleft() {
    path.attr("stroke-opacity", 1);
    dot.attr("display", "none");
    svg.node().value = null;
    svg.dispatch("input", { bubbles: true });
  }

  return Object.assign(svg.node(), { scales: { color } });
}
;

const _172 = (md) => {
return (
md`# Genres and Top Artists most influenced by Oceanus Folk`
)
};

const _195 = function genre_bar_chart(genres_influenced_by_oceanus,d3)
{
  const data = genres_influenced_by_oceanus
    .map((d) => ({
      genre: d.genre,
      count: +d.n
    }))
    .sort((a, b) => d3.descending(a.count, b.count))
    .slice(0, 15);

  const barHeight = 28;
  const marginTop = 60;
  const marginRight = 50;
  const marginBottom = 35;
  const marginLeft = 160;
  const width = 928;
  const height = Math.ceil(data.length * barHeight) + marginTop + marginBottom;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count)])
    .nice()
    .range([marginLeft, width - marginRight]);

  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.genre))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.15);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 11px sans-serif;");

  svg
    .append("text")
    .attr("x", marginLeft)
    .attr("y", 22)
    .attr("font-size", 16)
    .attr("font-weight", "bold")
    .text("Genres most influenced by Oceanus Folk");

  svg
    .append("g")
    .attr("fill", "steelblue")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.genre))
    .attr("width", (d) => x(d.count) - x(0))
    .attr("height", y.bandwidth());

  svg
    .append("g")
    .attr("fill", "black")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", (d) => x(d.count) + 5)
    .attr("y", (d) => y(d.genre) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d.count);

  svg
    .append("g")
    .attr("transform", `translate(0,${marginTop - 10})`)
    .call(d3.axisTop(x).ticks(width / 100))
    .call((g) => g.select(".domain").remove());

  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0));

  svg
    .append("text")
    .attr("x", width - marginRight)
    .attr("y", height - 5)
    .attr("text-anchor", "end")
    .attr("fill", "gray")
    .text("Count of influence links");

  return svg.node();
}
;

const _197 = function artist_bar_chart(d3,artists_influenced_by_oceanus)
{
  const maxEdges = d3.max(
    artists_influenced_by_oceanus,
    (d) => +d.influence_edges
  );

  const data = artists_influenced_by_oceanus
    .map((d) => {
      const influencedWorks = +d.influenced_works;
      const influenceEdges = +d.influence_edges;

      return {
        artist: d.artist_name,
        type: d.artist_type,
        influencedWorks,
        influenceEdges,
        score: influencedWorks + influenceEdges / maxEdges,
        genres: d.genres,
        roles: d.roles,
        firstYear: d.first_year,
        latestYear: d.latest_year
      };
    })
    .sort(
      (a, b) =>
        d3.descending(a.influencedWorks, b.influencedWorks) ||
        d3.descending(a.influenceEdges, b.influenceEdges) ||
        d3.descending(a.score, b.score)
    )
    .slice(0, 15);

  const barHeight = 30;
  const marginTop = 60;
  const marginRight = 70;
  const marginBottom = 45;
  const marginLeft = 230;
  const width = 928;
  const height = Math.ceil(data.length * barHeight) + marginTop + marginBottom;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.score)])
    .nice()
    .range([marginLeft, width - marginRight]);

  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.artist))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.15);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 11px sans-serif;");

  svg
    .append("text")
    .attr("x", marginLeft)
    .attr("y", 22)
    .attr("font-size", 16)
    .attr("font-weight", "bold")
    .text("Top artists influenced by Oceanus Folk");

  const bars = svg
    .append("g")
    .attr("fill", "steelblue")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.artist))
    .attr("width", (d) => x(d.score) - x(0))
    .attr("height", y.bandwidth())
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "darkorange");
      showTooltip(d);
    })
    .on("mousemove", function (event, d) {
      showTooltip(d);
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "steelblue");
      hideTooltip();
    });

  svg
    .append("g")
    .attr("fill", "black")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", (d) => x(d.score) + 5)
    .attr("y", (d) => y(d.artist) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d.score.toFixed(2));

  svg
    .append("g")
    .attr("transform", `translate(0,${marginTop - 10})`)
    .call(d3.axisTop(x).ticks(5))
    .call((g) => g.select(".domain").remove());

  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0));

  svg
    .append("text")
    .attr("x", width - marginRight)
    .attr("y", height - 8)
    .attr("text-anchor", "end")
    .attr("fill", "gray")
    .text("Combined score: works + scaled influence links");

  const tooltip = svg
    .append("g")
    .attr("display", "none")
    .attr("pointer-events", "none")
    .raise();

  const tooltipBg = tooltip
    .append("rect")
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#999")
    .attr("opacity", 0.97);

  const tooltipText = tooltip
    .append("text")
    .attr("font-size", 11)
    .attr("fill", "black");

  function showTooltip(d) {
    tooltipText.selectAll("tspan").remove();

    const lines = [
      d.artist,
      `${d.influencedWorks} works, ${d.influenceEdges} links`,
      `Score: ${d.score.toFixed(2)}`,
      `Years: ${d.firstYear}–${d.latestYear}`,
      `Type: ${d.type}`
    ];

    tooltipText
      .selectAll("tspan")
      .data(lines)
      .join("tspan")
      .attr("x", 0)
      .attr("dy", (line, i) => (i === 0 ? "0em" : "1.25em"))
      .attr("font-weight", (line, i) => (i === 0 ? "bold" : "normal"))
      .text((line) => line);

    const bbox = tooltipText.node().getBBox();
    const padding = 8;

    tooltipBg
      .attr("x", bbox.x - padding)
      .attr("y", bbox.y - padding)
      .attr("width", bbox.width + padding * 2)
      .attr("height", bbox.height + padding * 2);

    let tx = x(d.score) + 12;
    let ty = y(d.artist) + y.bandwidth() / 2 - bbox.height / 2;

    const tooltipWidth = bbox.width + padding * 2;
    const tooltipHeight = bbox.height + padding * 2;

    if (tx + tooltipWidth > width - 5) {
      tx = x(d.score) - tooltipWidth - 12;
    }

    if (tx < 5) {
      tx = 5;
    }

    if (ty < 5) {
      ty = 5;
    }

    if (ty + tooltipHeight > height - 5) {
      ty = height - tooltipHeight - 5;
    }

    tooltip
      .raise()
      .attr("display", null)
      .attr("transform", `translate(${tx},${ty + padding + 8})`);
  }

  function hideTooltip() {
    tooltip.attr("display", "none");
  }

  return svg.node();
}
;

const _174 = (md) => {
return (
md`# Oceanus Folk rise with Sailor Shift, and Genres influencing Oceanus Folk`
)
};

const _199 = async function StackedAreaChart(inspiration_over_time,oceanus_folk_notoriety,d3)
{
  const width = 928;
  const height = 500;
  const marginTop = 80;
  const marginRight = 220;
  const marginBottom = 30;
  const marginLeft = 45;

  const sailorShiftRiseYear = 2029;

  const raw = await inspiration_over_time;
  const notorietyRaw = await oceanus_folk_notoriety;

  let aggregated = Array.from(
    d3.rollup(
      raw,
      (v) => v.length,
      (d) => +d.year,
      (d) => d.inspiring_genre
    ),
    ([year, genreMap]) =>
      Array.from(genreMap, ([genre, value]) => ({
        year,
        genre,
        value
      }))
  ).flat();

  const topGenres = new Set(
    Array.from(
      d3.rollup(
        aggregated,
        (v) => d3.sum(v, (d) => d.value),
        (d) => d.genre
      ),
      ([genre, total]) => ({ genre, total })
    )
      .sort((a, b) => d3.descending(a.total, b.total))
      .slice(0, 50)
      .map((d) => d.genre)
  );

  aggregated = Array.from(
    d3.rollup(
      aggregated.map((d) => ({
        year: d.year,
        genre: topGenres.has(d.genre) ? d.genre : "Other",
        value: d.value
      })),
      (v) => d3.sum(v, (d) => d.value),
      (d) => d.year,
      (d) => d.genre
    ),
    ([year, genreMap]) =>
      Array.from(genreMap, ([genre, value]) => ({
        year,
        genre,
        value
      }))
  ).flat();

  const data = aggregated.map((d) => ({
    date: new Date(+d.year, 0, 1),
    year: +d.year,
    genre: d.genre,
    value: +d.value
  }));

  const normalizeName = (s) =>
    String(s)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const sailorPopularity = Array.from(
    d3.rollup(
      notorietyRaw.filter(
        (d) => normalizeName(d.artist_name) === "sailor shift"
      ),
      (v) => d3.sum(v, (d) => +d.n),
      (d) => +d.year
    ),
    ([year, value]) => ({
      date: new Date(+year, 0, 1),
      year: +year,
      value: +value
    })
  ).sort((a, b) => d3.ascending(a.year, b.year));

  const keys = Array.from(d3.union(data.map((d) => d.genre)));
  const activeKeys = new Set(keys);

  const series = d3
    .stack()
    .keys(keys)
    .value(([, D], key) => D.get(key)?.value ?? 0)(
    d3.index(
      data,
      (d) => d.date,
      (d) => d.genre
    )
  );

  const allDates = [
    ...data.map((d) => d.date),
    ...sailorPopularity.map((d) => d.date)
  ];

  const x = d3
    .scaleUtc()
    .domain(d3.extent(allDates))
    .range([marginLeft, width - marginRight]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d3.max(d, (d) => d[1]))])
    .nice()
    .rangeRound([height - marginBottom, marginTop]);

  const yPopularity = d3
    .scaleLinear()
    .domain([0, d3.max(sailorPopularity, (d) => d.value) ?? 1])
    .nice()
    .rangeRound([height - marginBottom, marginTop]);

  const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

  const area = d3
    .area()
    .x((d) => x(d.data[0]))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]));

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => yPopularity(d.value));

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  svg
    .append("text")
    .attr("x", marginLeft)
    .attr("y", 24)
    .attr("font-size", 14)
    .attr("font-weight", "bold")
    .text("Oceanus Folk inspirations over time");

  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 80))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", marginTop - 25)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Inspiration count")
    );

  const areaPaths = svg
    .append("g")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("class", "genre-area")
    .attr("fill", (d) => color(d.key))
    .attr("fill-opacity", 0.8)
    .attr("d", area)
    .on("mouseenter", function (event, d) {
      if (!activeKeys.has(d.key)) return;

      areaPaths.attr("fill-opacity", (s) => (s.key === d.key ? 0.95 : 0.18));

      d3.select(this).raise();

      const total = d3.sum(d, (p) => p[1] - p[0]);
      showTooltip(event, [d.key, `Total inspiration count: ${total}`]);
    })
    .on("mousemove", function (event, d) {
      if (!activeKeys.has(d.key)) return;

      const total = d3.sum(d, (p) => p[1] - p[0]);
      showTooltip(event, [d.key, `Total inspiration count: ${total}`]);
    })
    .on("mouseleave", function () {
      areaPaths.attr("fill-opacity", (d) =>
        activeKeys.has(d.key) ? 0.8 : 0.08
      );

      hideTooltip();
    });

  areaPaths.append("title").text((d) => d.key);

  let sailorLine;

  if (sailorPopularity.length) {
    sailorLine = svg
      .append("path")
      .datum(sailorPopularity)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    svg
      .append("path")
      .datum(sailorPopularity)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 14)
      .attr("d", line)
      .on("mouseenter", function (event) {
        sailorLine.attr("stroke-width", 4);
        showSailorTooltip(event);
      })
      .on("mousemove", function (event) {
        showSailorTooltip(event);
      })
      .on("mouseleave", function () {
        sailorLine.attr("stroke-width", 2.5);
        hideTooltip();
      });
  }

  svg
    .append("line")
    .attr("x1", x(new Date(sailorShiftRiseYear, 0, 1)))
    .attr("x2", x(new Date(sailorShiftRiseYear, 0, 1)))
    .attr("y1", marginTop)
    .attr("y2", height - marginBottom)
    .attr("stroke", "black")
    .attr("stroke-dasharray", "4,4");

  svg
    .append("text")
    .attr("x", x(new Date(sailorShiftRiseYear, 0, 1)) + 6)
    .attr("y", marginTop + 12)
    .attr("font-size", 10)
    .text("Sailor Shift era");

  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  svg
    .append("line")
    .attr("x1", width - marginRight + 20)
    .attr("x2", width - marginRight + 42)
    .attr("y1", 72)
    .attr("y2", 72)
    .attr("stroke", "black")
    .attr("stroke-width", 2.5);

  svg
    .append("text")
    .attr("x", width - marginRight + 48)
    .attr("y", 76)
    .attr("font-size", 10)
    .text("Sailor Shift popularity");

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - marginRight + 20}, 95)`);

  const legendItems = legend
    .selectAll("g")
    .data(keys)
    .join("g")
    .attr("transform", (d, i) => `translate(0,${i * 16})`)
    .style("cursor", "pointer")
    .on("click", function (event, key) {
      if (activeKeys.has(key)) {
        activeKeys.delete(key);
      } else {
        activeKeys.add(key);
      }

      areaPaths
        .attr("display", (d) => (activeKeys.has(d.key) ? null : "none"))
        .attr("fill-opacity", (d) => (activeKeys.has(d.key) ? 0.8 : 0.08));

      legendItems.attr("opacity", (d) => (activeKeys.has(d) ? 1 : 0.35));
    })
    .on("mouseenter", function (event, key) {
      if (!activeKeys.has(key)) return;

      areaPaths.attr("fill-opacity", (d) => (d.key === key ? 0.95 : 0.18));

      const s = series.find((d) => d.key === key);
      const total = d3.sum(s, (p) => p[1] - p[0]);

      showTooltip(event, [
        key,
        `Total inspiration count: ${total}`,
        "Click legend to hide/show"
      ]);
    })
    .on("mousemove", function (event, key) {
      if (!activeKeys.has(key)) return;

      const s = series.find((d) => d.key === key);
      const total = d3.sum(s, (p) => p[1] - p[0]);

      showTooltip(event, [
        key,
        `Total inspiration count: ${total}`,
        "Click legend to hide/show"
      ]);
    })
    .on("mouseleave", function () {
      areaPaths.attr("fill-opacity", (d) =>
        activeKeys.has(d.key) ? 0.8 : 0.08
      );

      hideTooltip();
    });

  legendItems
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", (d) => color(d));

  legendItems
    .append("text")
    .attr("x", 16)
    .attr("y", 9)
    .attr("font-size", 10)
    .text((d) => d);

  const tooltip = svg
    .append("g")
    .attr("display", "none")
    .attr("pointer-events", "none");

  const tooltipBg = tooltip
    .append("rect")
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#999")
    .attr("opacity", 0.96);

  const tooltipText = tooltip
    .append("text")
    .attr("font-size", 11)
    .attr("fill", "black");

  function showTooltip(event, lines) {
    tooltipText.selectAll("tspan").remove();

    tooltipText
      .selectAll("tspan")
      .data(lines)
      .join("tspan")
      .attr("x", 0)
      .attr("dy", (d, i) => (i === 0 ? "0em" : "1.25em"))
      .attr("font-weight", (d, i) => (i === 0 ? "bold" : "normal"))
      .text((d) => d);

    const bbox = tooltipText.node().getBBox();
    const padding = 8;

    tooltipBg
      .attr("x", bbox.x - padding)
      .attr("y", bbox.y - padding)
      .attr("width", bbox.width + padding * 2)
      .attr("height", bbox.height + padding * 2);

    let [mx, my] = d3.pointer(event, svg.node());

    let tx = mx + 14;
    let ty = my - 10;

    const tooltipWidth = bbox.width + padding * 2;
    const tooltipHeight = bbox.height + padding * 2;

    if (tx + tooltipWidth > width - 5) {
      tx = mx - tooltipWidth - 14;
    }

    if (ty < 5) {
      ty = 5;
    }

    if (ty + tooltipHeight > height - 5) {
      ty = height - tooltipHeight - 5;
    }

    tooltip
      .raise()
      .attr("display", null)
      .attr("transform", `translate(${tx},${ty + padding + 8})`);
  }

  function showSailorTooltip(event) {
    const [mx] = d3.pointer(event, svg.node());
    const hoveredDate = x.invert(mx);
    const closest =
      sailorPopularity[
        d3.leastIndex(sailorPopularity, (d) => Math.abs(d.date - hoveredDate))
      ];

    if (!closest) return;

    showTooltip(event, [
      "Sailor Shift popularity",
      `Year: ${closest.year}`,
      `Count: ${closest.value}`
    ]);
  }

  function hideTooltip() {
    tooltip.attr("display", "none");
  }

  return Object.assign(svg.node(), { scales: { color } });
}
;

const _202 = async function chart(d3,oceanus_flows)
{
  const width = 928;
  const height = 600;
  const format = d3.format(",.0f");

  const nodeAlign = "sankeyJustify";
  const linkColor = "source-target";

  const raw = await oceanus_flows;

  const linksData = raw
    .filter(d => d.type === "Genres inspiring Oceanus Folk")
    .filter(d => d.from !== d.to)
    .map(d => ({
      source: d.from,
      target: d.to,
      value: +d.value,
      type: d.type
    }))
    .sort((a, b) => d3.descending(a.value, b.value));

  const nodesData = Array.from(
    new Set(linksData.flatMap(d => [d.source, d.target])),
    name => ({
      name,
      category: name === "Oceanus Folk" ? "Oceanus Folk" : "Source genre"
    })
  );

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Title
  svg.append("text")
      .attr("x", 20)
      .attr("y", 24)
      .attr("font-size", 16)
      .attr("font-weight", "bold")
      .text("Genres Inspiring Oceanus Folk");

  const sankey = d3.sankey()
      .nodeId(d => d.name)
      .nodeAlign(d3[nodeAlign])
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 40], [width - 1, height - 5]]);

  const {nodes, links} = sankey({
    nodes: nodesData.map(d => ({...d})),
    links: linksData.map(d => ({...d}))
  });

  const color = d3.scaleOrdinal()
      .domain(["Source genre", "Oceanus Folk"])
      .range(d3.schemeCategory10);

  const rect = svg.append("g")
      .attr("stroke", "#000")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => color(d.category));

  rect.append("title")
      .text(d => `${d.name}\n${format(d.value)} influence score`);

  const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
    .selectAll("g")
    .data(links)
    .join("g")
      .style("mix-blend-mode", "multiply");

  if (linkColor === "source-target") {
    const gradient = link.append("linearGradient")
        .attr("id", (d, i) => `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => color(d.source.category));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => color(d.target.category));
  }

  link.append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", (d, i) =>
        linkColor === "source-target" ? `url(#gradient-${i})`
        : linkColor === "source" ? color(d.source.category)
        : linkColor === "target" ? color(d.target.category)
        : linkColor
      )
      .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title")
      .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)} influence score`);

  svg.append("g")
    .selectAll("text.node-label")
    .data(nodes)
    .join("text")
      .attr("class", "node-label")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);

  return svg.node();
}
;

const _135 = (md) => {
return (
md`## Data Processing

### Data Checking & Handling

The raw JSON file was loaded and separated into nodes and links representing the songs, albums, people, groups and the links, representing the relationships between them. The "inspect_raw_data" function handled systematic data checking:

* Missing node IDs, duplicate node IDs, missing names, and genres
* Missing source/target values, duplicate links, self-loops and invalid links to non-existent nodes
* Identified any orphan nodes that were isolated
* Checked temporal conflicts such as release dates ealier than written dates and notoriety dates earlier than release dates

These checks were crucial as the dataset is relational, and errors could distort network and time-based visualisations. Data issues were handled selectively to avoid unnecessary data loss and reduce risk of biasing results. Three duplicate links were removed as repeated edges would artificially inflate influence and make artists or genres appear more influential than they were. One self-loop was also removed because a work influencing itself is meaningless analytically. Auditing throughout the whole process made the process transparent.

### Data Transformation
The transformation stage made data more consistent and suitable for analysis. Column names were standardised by replacing spaces with underscores, matching the existing schema and making it easier to use. Date fields such as "release_date" were converted from string to numeric values to support time-series analysis. Text fields were cleaned by trimming white space and standardising capitalisation, enforcing standardised schema to ensure proper processing. A "display_name" field was also created to combine stage names and real names to improve readability in the final visualisations.

### Computational and network analysis
Analysis in this stage on influenced-related edge types: "InstyleOf", "InterpolatesFrom", "DirectlySamples", "CoverOf" and "LyricalReferenceTo". Yearly counts of Oceanus Folk, influence of Oceanus Folk and a cross-genre influence matrix were computed. This allowed computation beyond simply count, by analysing directional relationships between works, genres, and creators.

### Export
Cleaned and transformed datasets were exported as separate JSON files for Observable allowing for modular, easily-deployed JSON files making the visualisation workflow easier to manage. These prepared data for different charts suchas time-series charts.`
)
};

const _148 = (md) => {
return (
md`## Visualisation Design
Visualisation design was chosen according to structure of dataset and the task of analysis. The data was presented as directed, influence networks containing works, artists, genres, dates and relationship types, so design needed to clearly illustrate temporal change, and connections.

### Question 2a
Question 2a utilised a dual time-series line chart as the main task was to compare change over time for Ocean Folk releases, and influenced non-Oceanus works. The x-axis represents year and the y-axis represents count. The shared scale allowed for the clearest comparing of quantitative values side by side with colour separation allowing viewers to easily compare Oceanus Folk's internal activity against its external influence.

The move-average trend lines were added to reveal broader patterns adding a dimension of analysis as it supports both yearly inspection and long-term interpretation. A single line highlights Sailor Shift's rise in 2028 helping users connect data to meaningful context. This suited temporal analysis as it made periods of growth and decline easy to identify.

### Question 2b

For question 2b, a ranked horizontal bar chart was used to show genres and artists most influenced by Oceanus Folk. This was suited to the question as the task was comparative, a simple bar chart was best for users to identify which categories or artists had the highest influence counts. Intrinsically, the bar length encodes influence count, while the y-axis lists genres or axists. Additionally, the bar chart was sorted in descending order, which supported easy positional analysis, making it clear that Desert Rock received the most Oceanus Folk influence compared to others. The artist chart uses a combined score allowing artist influence to be summarised.

### Question 2c

For 2c, a stacked area chart and a Sankey-style flow diagram were used because the task involved both change over time and directional genre influence. The stacked area chart shows Oceanus Folk inspirations over time, with year mapped to x-axis, inspiration mapped to height and colour mapped. Due to the density of information, a toggle and hover allowed users to focus on specifc genres and view a genre's statistics in more detail allowing users to see not only when inspiration increased, but which genres contributed to that increase.

The Sankey diagram was used to show genres inspiring Oceanus Folk. This was suited as the data represented directional flow from source genres into Oceanus Folk. The thickness of each flow and order intrinsically encodes influence count and significance, making dominant sources such as Indie Folk obvious. Together, these visualisations show both the timing and structure of Oceanus Folk's influences.
`
)
};

const _216 = (md) => {
return (
md`## Answers

### Question 2a
The visualisation shows that Oceanus Folk's influence was initially intermittent, but then became gradual. The earlier years show both Oceanus Folk releases and influence remain low and uneven with occasional spikes. From the late 2010s and to most prominently, the 2020s, the pattern changes. Oceanus Folk releases become more frequent, and influence rises sharply. The strongest spread appears in the late 2020s, where influenced works peak well above earlier levels signifying accumulation over time which expanded outwards into the wider musical network.

### Question 2b
The ranked bar charts shows that the genres most influenced by Oceanus Folk is Desert Rock (50), followed by Dream Pop (42), Indie Folk (42), and Space Rock (35). After these genres, there is a considerable influence drop with Synthwave (16), and Americana (11). This indicates that Oceanus Folk's impact is concentrated in a few genres, with lingering effects into some others.

At the artist level, the most influenced artist is Blazing Collective (4.0), followed by Xiuying Yao (3.8), Ming Zhao (3.8), Xiuying Xie (3.6), and Jonathon Diaz (3.6). Below this, the artists cluster at 2.8 ~ 2.6.

It is notable to mention that both charts highlight the pattern of dense concentration at the top, then lingering effects onto other categories/artists.

### Question 2c
The stacked area chart shows that with the rise of Sailor Shift, Oceanus Folk becomes more diverse in its inspirations. This is evidenced by certain genres such as Space Rock and Post-Apocalpytic Folk amongst others being virtually absent before Sailor Shift's rise. Around this time, we see a wider range of genres contribute suggesting that Oceanus Folk transform into a more hybrid cross-genre form.

The Sankey diagram shows that in the Oceanus Folk inspiration compisiton, Indie Folk is overwhelmingly the dominant source flowing into Oceanus Folk. Other contributions come from Synthwave, Dream Pop, Doom Metal, Psychedelic Rock, Synthpop and Desert Rock. This reflects the notion that Oceanus Folk is no longer shaped by tradition, but is becoming increasingly electronic.

This coincides with a period where Oceanus Folk becomes broader, open to external influence and more diverse.

`
)
};

const _222 = (md) => {
return (
md`## Reflection

The first challenge was to avoid an unreadable network, the dataset is network. Showing every node would create a dense effect making patterns difficult to interpret. The solution for this was to create smaller modular aggregations, such as genre-to-genre flow summaries, ranked artist charts and yearly influence counts to avoid visual overload.

The second challenge was showing whether influence was intermittent or gradual, the charts showed fluctuations and it was difficult to tell whether Occeanus Folk was either rising genuinely, or spiking only occassionally. Hence, a moving average was then calculated and modelled in the graph to be able to detect trends alongside exact yearly values and markers for important moments such as the Sailor Shift rise for context, balancing detail and overview.

The third challenge was to represent the directional flow of a genre influences to Oceanus Folk. A bar chart could rank genres but not represent the direction of influence into Oceanus Folk. Hence, a Sankey-style flow diagram was chosen because the layout naturally encodes direction and thickness for influence count. The final design communications quantity and direction more effectively than a bar chart.

Forming smaller compact exportable packets of data that could be plugged into visualisations greatly improved the visualisation workflow efficiency. The modularity made changing data to accomodate charts easy. All charts effectively showed that they needed to.`
)
};

const _68 = (md) => {
return (
md`# Task 3 - Sebastian Sydenham - 83209940`
)
};

const _71 = function barchart_data(FileAttachment){return(
FileAttachment("barchart_data.csv").csv()
)};

const _73 = function influence_map_data(FileAttachment){return(
FileAttachment("influence_map_data.json").json()
)};

const _75 = function line_chart_data(FileAttachment){return(
FileAttachment("line_chart_data.csv").csv()
)};

const _77 = function star_finder_data(FileAttachment){return(
FileAttachment("star_finder_data.csv").csv()
)};

const _83 = (md) => {
return (
md`## Songs Released Per Year Since Debut
Zoomable bar chart. Darker bars represent notable releases. Lighter bars represent non-notable releases. Interactive toggles to filter out artists and to visualise strictly notable releases. `
)
};

const _85 = function barchart(barchart_data,d3)
{
  const rawData = barchart_data;
  const targetArtists = ["Sailor Shift", "Kimberly Snyder", "Jay Walters"];

  let showOnlyNotableState = false;
  let activeArtists = new Set(targetArtists);
  let currentTransform = d3.zoomIdentity;

  const container = d3
    .create("div")
    .attr(
      "style",
      "display: flex; flex-direction: column; gap: 15px; font-family: sans-serif;"
    );

  const controls = container
    .append("div")
    .attr(
      "style",
      "display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-left: 50px;"
    );

  const toggleLabel = controls
    .append("label")
    .attr(
      "style",
      "cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: bold; user-select: none;"
    );

  toggleLabel
    .append("input")
    .attr("type", "checkbox")
    .property("checked", showOnlyNotableState)
    .on("change", (e) => {
      showOnlyNotableState = e.target.checked;
      updateChart();
    });
  toggleLabel.append("span").text("Show Only Notable Songs");

  const legend = controls
    .append("div")
    .attr(
      "style",
      "display: flex; gap: 10px; border-left: 2px solid #ccc; padding-left: 20px;"
    );

  const legendColours = {
    "Sailor Shift": "#08519c",
    "Kimberly Snyder": "#a63603",
    "Jay Walters": "#006d2c"
  };

  legend
    .selectAll("div.legend-item")
    .data(targetArtists)
    .join("div")
    .attr("class", "legend-item")
    .attr(
      "style",
      (d) => `
          cursor: pointer; padding: 4px 10px; border-radius: 20px; 
          font-size: 13px; font-weight: bold; user-select: none; transition: all 0.2s;
          border: 2px solid ${legendColours[d]};
          background: ${legendColours[d]}; color: white; 
      `
    )
    .text((d) => d)
    .on("click", function (e, d) {
      if (activeArtists.has(d)) {
        if (activeArtists.size === 1) return; // Prevent deselecting all
        activeArtists.delete(d);
        d3.select(this)
          .style("background", "transparent")
          .style("color", legendColours[d])
          .style("opacity", 0.5);
      } else {
        activeArtists.add(d);
        d3.select(this)
          .style("background", legendColours[d])
          .style("color", "white")
          .style("opacity", 1);
      }
      updateChart();
    });

  const width = 1300,
    height = 500;
  const marginTop = 20,
    marginRight = 0,
    marginBottom = 40,
    marginLeft = 50;

  const allUniqueYears = Array.from(
    new Set(rawData.map((d) => String(d.years_since_debut)))
  ).sort((a, b) => Number(a) - Number(b));

  const x0 = d3
    .scaleBand()
    .domain(allUniqueYears)
    .range([marginLeft, width - marginRight])
    .paddingInner(0.1);
  const x1 = d3.scaleBand().padding(0.05);
  const y = d3.scaleLinear().range([height - marginBottom, marginTop]);

  const colour = d3
    .scaleOrdinal()
    .domain([
      "Sailor Shift (Notable)",
      "Sailor Shift (Standard)",
      "Kimberly Snyder (Notable)",
      "Kimberly Snyder (Standard)",
      "Jay Walters (Notable)",
      "Jay Walters (Standard)"
    ])
    .range([
      "#08519c",
      "#9ecae1",
      "#a63603",
      "#a637038f",
      "#006d2c",
      "#a1d99b"
    ]);

  const xAxis = d3
    .axisBottom(x0)
    .tickFormat((d) => `Year ${d}`)
    .tickSizeOuter(0);
  const yAxis = d3.axisLeft(y);
  const yGrid = d3
    .axisLeft(y)
    .tickSize(-width + marginLeft + marginRight)
    .tickFormat("");

  const svg = container
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto;")
    .call(zoom);

  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "clip-bars-chart")
    .append("rect")
    .attr("x", marginLeft)
    .attr("y", -marginTop)
    .attr("width", width - marginLeft - marginRight)
    .attr("height", height + marginBottom + marginTop);

  const gridGroup = svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${marginLeft},0)`)
    .attr("opacity", 0.1);
  const clipWrapper = svg
    .append("g")
    .attr("clip-path", "url(#clip-bars-chart)");

  const barsGroup = clipWrapper.append("g").attr("class", "bars-container");
  const xAxisGroup = clipWrapper
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - marginBottom})`);
  const yAxisGroup = svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${marginLeft},0)`);

  yAxisGroup
    .append("text")
    .attr("x", -marginLeft)
    .attr("y", 10)
    .attr("fill", "currentColor")
    .attr("text-anchor", "start")
    .text("Number of Songs Released");
  svg
    .append("text")
    .attr("x", width - marginRight)
    .attr("y", height - 5)
    .attr("fill", "currentColor")
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .text("Years Since Debut");

  function updateChart() {
    const isNotable = (d) =>
      d.notable === true || String(d.notable).toUpperCase() === "TRUE";

    const filteredData = rawData.filter((d) => {
      if (showOnlyNotableState && !isNotable(d)) return false;
      if (!activeArtists.has(d.artist_name)) return false;
      return true;
    });

    const rollups = d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => String(d.years_since_debut),
      (d) => d.artist_name,
      (d) => (isNotable(d) ? "Notable" : "Standard")
    );

    const processedData = [];
    for (const [year, artists] of rollups) {
      for (const [artist, statuses] of artists) {
        const notableCount = statuses.get("Notable") || 0;
        const standardCount = statuses.get("Standard") || 0;
        processedData.push({
          id: year + artist,
          year: year,
          artist: artist,
          notable: notableCount,
          standard: standardCount,
          total: notableCount + standardCount,
          keyNotable: `${artist} (Notable)`,
          keyStandard: `${artist} (Standard)`
        });
      }
    }

    const maxTotal = d3.max(processedData, (d) => d.total) || 1;
    y.domain([0, maxTotal]).nice();
    x1.domain(Array.from(activeArtists));

    const activeYears = Array.from(
      new Set(filteredData.map((d) => String(d.years_since_debut)))
    ).sort((a, b) => Number(a) - Number(b));
    x0.domain(activeYears);

    const integerTicks = y.ticks().filter(Number.isInteger);
    yAxis.tickValues(integerTicks).tickFormat(d3.format("d"));
    yGrid.tickValues(integerTicks);

    x0.range(
      [marginLeft, width - marginRight].map((d) => currentTransform.applyX(d))
    );
    x1.rangeRound([0, x0.bandwidth()]);

    const t = svg.transition().duration(500);

    xAxisGroup
      .transition(t)
      .call(xAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("x1", -x0.bandwidth() / 2)
          .attr("x2", x0.bandwidth() / 2)
      );
    yAxisGroup
      .transition(t)
      .call(yAxis)
      .call((g) => g.select(".domain").remove());
    gridGroup
      .transition(t)
      .call(yGrid)
      .call((g) => g.select(".domain").remove());

    barsGroup
      .selectAll("rect.standard-bar")
      .data(processedData, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "standard-bar")
            .attr("fill", (d) => colour(d.keyStandard)) // === EDITED ===
            .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
            .attr("y", y(0))
            .attr("width", x1.bandwidth())
            .attr("height", 0)
            .call((e) =>
              e
                .transition(t)
                .attr("y", (d) => y(d.standard))
                .attr("height", (d) => y(0) - y(d.standard))
            ),
        (update) =>
          update.call((u) =>
            u
              .transition(t)
              .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
              .attr("y", (d) => y(d.standard))
              .attr("width", x1.bandwidth())
              .attr("height", (d) => y(0) - y(d.standard))
          ),
        (exit) =>
          exit.call((e) =>
            e.transition(t).attr("y", y(0)).attr("height", 0).remove()
          )
      )
      .join(
        (enter) => enter.append("title"),
        (update) => update.select("title")
      )
      .text(
        (d) => `${d.artist}\nYear: ${d.year}\nStandard Tracks: ${d.standard}`
      );

    barsGroup
      .selectAll("rect.notable-bar")
      .data(processedData, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "notable-bar")
            .attr("fill", (d) => colour(d.keyNotable)) // === EDITED ===
            .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
            .attr("y", (d) => y(d.standard))
            .attr("width", x1.bandwidth())
            .attr("height", 0)
            .call((e) =>
              e
                .transition(t)
                .attr("y", (d) => y(d.standard + d.notable))
                .attr(
                  "height",
                  (d) => y(d.standard) - y(d.standard + d.notable)
                )
            ),
        (update) =>
          update.call((u) =>
            u
              .transition(t)
              .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
              .attr("y", (d) => y(d.standard + d.notable))
              .attr("width", x1.bandwidth())
              .attr("height", (d) => y(d.standard) - y(d.standard + d.notable))
          ),
        (exit) =>
          exit.call((e) =>
            e
              .transition(t)
              .attr("y", (d) => y(d.standard))
              .attr("height", 0)
              .remove()
          )
      )
      .join(
        (enter) => enter.append("title"),
        (update) => update.select("title")
      )
      .text(
        (d) => `${d.artist}\nYear: ${d.year}\nNotable Tracks: ${d.notable}`
      );
  }

  updateChart();
  return container.node();

  function zoom(svg) {
    const extent = [
      [marginLeft, marginTop],
      [width - marginRight, height - marginTop]
    ];

    svg.call(
      d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed)
    );

    function zoomed(event) {
      currentTransform = event.transform;

      x0.range(
        [marginLeft, width - marginRight].map((d) => event.transform.applyX(d))
      );
      x1.rangeRound([0, x0.bandwidth()]);

      svg
        .selectAll(".standard-bar")
        .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
        .attr("width", x1.bandwidth());

      svg
        .selectAll(".notable-bar")
        .attr("x", (d) => x0(d.year) + (x1(d.artist) || 0))
        .attr("width", x1.bandwidth());

      svg
        .selectAll(".x-axis")
        .call(xAxis)
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("x1", -x0.bandwidth() / 2)
            .attr("x2", x0.bandwidth() / 2)
        );
    }
  }
}
;

const _88 = (md) => {
return (
md`## Influence Map
Each point on the graph represents a unique song/album/artist that took influence from the selected artist. 
The colour of a point represents the way in which the selected artist influenced the song/album/artist.
The Shape of a point represents the genre of the song/album/artist. 
The visualisation can be filtered by Influence Type, Genre and Era.`
)
};

const _90 = function viewof$selectedCenterArtist2(Inputs){return(
Inputs.radio(
  ["Sailor Shift", "Kimberly Snyder", "Jay Walters"],
  { label: "Select Artist:", value: "Sailor Shift" }
)
)};

const _92 = function influenceNetworkMap(influence_map_data,selectedCenterArtist2,d3)
{
  const chartSize = 1350;
  const centre = chartSize / 2;

  const currentNetwork = influence_map_data[selectedCenterArtist2]; 
  const rawNodes = currentNetwork.nodes;
  const rawLinks = currentNetwork.links;
  const centerArtistId = currentNetwork.centerId; 

  let nodeMap = new Map(rawNodes.map(n => [n.id, n]));
  let songMap = new Map();
  
  let creationTypes = ["PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf"];
  let influenceTypesList = ["InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo"];

  let creationLinks = rawLinks.filter(l => creationTypes.includes(l['Edge Type'] || l.edge_type));
  let influenceLinks = rawLinks.filter(l => influenceTypesList.includes(l['Edge Type'] || l.edge_type));

  function getCreatorId(workId) {
    let link = creationLinks.find(l => l.target === workId || (l.target && l.target.id === workId));
    return link ? (link.source.id || link.source) : null;
  }

  influenceLinks.forEach(link => {
    let sourceId = link.source.id || link.source; 
    let edgeType = link['Edge Type'] || link.edge_type;
    let songNode = nodeMap.get(sourceId);
    
    if (!songNode) return;

    let creatorId = getCreatorId(sourceId);
    let creatorNode = creatorId ? nodeMap.get(creatorId) : null;
    let isArtistNode = (songNode['Node Type'] === "Person" || songNode['Node Type'] === "MusicalGroup");
    
    let displayTitle = songNode.name || "Unknown";
    let artistName = creatorNode ? creatorNode.name : (isArtistNode ? "General Discography" : "Unknown Artist");
    
    
    if (sourceId !== centerArtistId && creatorId !== centerArtistId) {
      
      if (!songMap.has(sourceId)) {
        let year = parseInt(songNode.release_date);
        let genre = songNode.genre;
        
        if (isArtistNode) {
            let artistWorks = creationLinks.filter(l => (l.source.id || l.source) === sourceId);
            let earliestYear = Infinity;
            let oldestGenre = null;

            artistWorks.forEach(wLink => {
                let workNode = nodeMap.get(wLink.target.id || wLink.target);
                if (workNode && workNode.release_date) {
                    let wYear = parseInt(workNode.release_date);
                    if (!isNaN(wYear) && wYear < earliestYear) {
                        earliestYear = wYear;
                        oldestGenre = workNode.genre; 
                    }
                }
            });
            
            if (earliestYear !== Infinity) {
                year = earliestYear;
                genre = oldestGenre;
            } else {
                year = 2020; 
            }
        } else if (isNaN(year)) {
            year = 2020; 
        }

        genre = genre || "Unknown Genre";

        songMap.set(sourceId, {
          id: sourceId,
          songTitle: displayTitle, 
          artist: artistName,
          genre: genre,            
          isArtistLevel: isArtistNode,
          isCenterNode: false,
          date: new Date(year, 0, 1),
          decade: Math.floor(year / 10) * 10,
          allTypes: new Set([edgeType]),
          primaryType: edgeType
        });
        
      } else {
        songMap.get(sourceId).allTypes.add(edgeType);
      }
    }
  });

  let nodes = Array.from(songMap.values()).map(n => {
    n.allTypes = Array.from(n.allTypes);
    n.influenceTypesString = n.allTypes.join(", ");
    return n;
  });

  nodes.push({
    id: centerArtistId,
    songTitle: selectedCenterArtist2,
    artist: "Selected Profile",
    genre: "Center",
    isArtistLevel: true,
    isCenterNode: true,
    date: new Date(2010, 0, 1), 
    decade: 2010,
    allTypes: [],
    primaryType: null,
    influenceTypesString: ""
  });

  let links = nodes.filter(n => !n.isCenterNode).map(n => ({
    source: n.id,
    target: centerArtistId
  }));



  let influencers = nodes.filter(n => !n.isCenterNode);

  if (influencers.length === 0) {
      let emptyContainer = d3.create("div")
          .style("text-align", "center")
          .style("font-family", "sans-serif")
          .style("padding", "50px");
      
      emptyContainer.append("h2").text(`Influence Map for ${selectedCenterArtist2}`);
      emptyContainer.append("p").text("No influence edges found targeting this artist's works.");
      return emptyContainer.node();
  }

  let uniqueGenres = Array.from(new Set(influencers.map(d => d.genre))).sort();

  const getCircle = (size) => d3.symbol().type(d3.symbolCircle).size(size)();
  const getSquare = (size) => d3.symbol().type(d3.symbolSquare).size(size)();
  const getTriangle = (size) => d3.symbol().type(d3.symbolTriangle).size(size)();
  const getDiamond = (size) => d3.symbol().type(d3.symbolDiamond).size(size)();
  const getStar = (size) => d3.symbol().type(d3.symbolStar).size(size)();
  const getCross = (size) => d3.symbol().type(d3.symbolCross).size(size)();
  const getWye = (size) => d3.symbol().type(d3.symbolWye).size(size)();

  const getPentagon = (size) => { const r = Math.sqrt(size / 2.4); return `M0,${-r} L${r*0.951},${-r*0.309} L${r*0.588},${r*0.809} L${-r*0.588},${r*0.809} L${-r*0.951},${-r*0.309} Z`; };
  const getHexagon = (size) => { const r = Math.sqrt(size / 2.6); return `M0,${-r} L${r*0.866},${-r*0.5} L${r*0.866},${r*0.5} L0,${r} L${-r*0.866},${r*0.5} L${-r*0.866},${-r*0.5} Z`; };
  const getInvTriangle = (size) => { const r = Math.sqrt(size / 1.3); return `M0,${r} L${r*0.866},${-r*0.5} L${-r*0.866},${-r*0.5} Z`; };
  const getRhombus = (size) => { const r = Math.sqrt(size / 1.5); return `M0,${-r*0.6} L${r*1.2},0 L0,${r*0.6} L${-r*1.2},0 Z`; };
  const getTrapezoid = (size) => { const r = Math.sqrt(size / 2.2); return `M${-r*0.6},${-r*0.7} L${r*0.6},${-r*0.7} L${r},${r*0.7} L${-r},${r*0.7} Z`; };

  const shapeGenerators = [
      getCircle, getSquare, getTriangle, getDiamond, getStar, getCross, getWye, 
      getPentagon, getHexagon, getInvTriangle, getRhombus, getTrapezoid
  ];
  
  let shapeScale = d3.scaleOrdinal().domain(uniqueGenres).range(shapeGenerators);

  let minDecade = d3.min(influencers, d => d.decade);
  let maxDecade = d3.max(influencers, d => d.decade);

  let timeScale = d3.scaleTime()
    .domain([new Date(minDecade, 0, 1), new Date(maxDecade + 10, 0, 1)])
    .range([150, centre - 80]);

  
  let decadeZones = {};
  for (let i = 0; i < influencers.length; i++) {
    let node = influencers[i];
    if (decadeZones[node.decade] === undefined) decadeZones[node.decade] = [];
    decadeZones[node.decade].push(node);
  }

  let decadesList = Object.keys(decadeZones);
  for (let i = 0; i < decadesList.length; i++) {
    let decade = decadesList[i];
    let group = decadeZones[decade];
    let count = group.length;

    for (let j = 0; j < group.length; j++) {
      let node = group[j];
      let angle = (j / count) * 2 * Math.PI;

      let radius = timeScale(node.date);
      let innerBoundary = timeScale(new Date(node.decade, 0, 1));
      let outerBoundary = timeScale(new Date(node.decade + 10, 0, 1));
      let padding = 15; 

      let insideRadius = Math.max(innerBoundary + padding, Math.min(outerBoundary - padding, radius));
      
      node.targetRadius = insideRadius;
      node.x = centre + node.targetRadius * Math.cos(angle);
      node.y = centre + node.targetRadius * Math.sin(angle);
    }
  }

  nodes.forEach(function (node) {
    if (node.isCenterNode) {
      node.fx = centre;
      node.fy = centre;
    }
  });

  const influenceTypes = ["InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo"];
  const colours = ["#fc0335", "#6b03fc", "#03fc84", "#0394fc", "#fc7703"];
  let colourScale = d3.scaleOrdinal().domain(influenceTypes).range(colours);

  let decades = [];
  for (let y = minDecade; y <= maxDecade + 10; y += 10) {
      decades.push(new Date(y, 0, 1));
  }
  
  let dummyNodes = decades.map(d => ({ isDummy: true, fx: centre, fy: centre - timeScale(d) }));
  let simNodes = nodes.concat(dummyNodes);

  let container = d3.create("div").style("width", "100%").style("font-family", "sans-serif");

  container.append("div")
    .style("text-align", "center")
    .style("font-size", "24px")
    .style("colour", "#333")
    .style("margin-bottom", "15px")
    .text(`Influence Map for ${selectedCenterArtist2}`);

  let searchBar = container.append("div")
    .style("margin", "10px auto")
    .style("width", "fit-content")
    .style("background", "white")
    .style("padding", "6px 16px")
    .style("border-radius", "20px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("display", "flex")
    .style("align-items", "center")
    .style("border", "1px solid #ddd");

  let searchInput = searchBar.append("input")
    .attr("type", "text")
    .attr("placeholder", "Search...")
    .style("border", "none")
    .style("outline", "none")
    .style("font-size", "14px")
    .style("width", "180px");

  searchInput.on("input", function () {
    liveSearch = this.value.trim().toLowerCase();
    updateFilters();
  });

  let svg = container.append("svg")
    .attr("viewBox", [0, 0, chartSize, chartSize])
    .attr("style", "max-width: 100%; height: auto; background: #ffffff; display: block; margin: 0 auto;");

  let highlightLayer = svg.append("g").attr("class", "era-highlight");
  let rings = svg.append("g").attr("class", "timeline-rings");

  decades.forEach(function (decade) {
    let r = timeScale(decade);
    
    rings.append("circle")
      .attr("cx", centre)
      .attr("cy", centre)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#b0b0b0")
      .attr("stroke-dasharray", "4 4");
      
    rings.append("text")
      .attr("class", "ring-text")
      .datum(decade.getFullYear())
      .attr("x", centre)
      .attr("y", centre - r - 8)
      .attr("text-anchor", "middle")
      .attr("fill", "#888")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(decade.getFullYear());
  });

  let sim = d3.forceSimulation(simNodes);
  sim.force("link", d3.forceLink(links).id((d) => d.id).strength(0));
  sim.force("radial", d3.forceRadial(d => (d.isDummy || d.isCenterNode) ? 0 : d.targetRadius, centre, centre).strength(d => d.isDummy ? 0 : 1));
  sim.force("collide", d3.forceCollide().radius(d => d.isDummy ? 20 : (d.isCenterNode ? 55 : 45)).iterations(6));
  sim.force("charge", d3.forceManyBody().strength(d => d.isDummy ? -20 : -120));

  let link = svg.append("g")
    .attr("stroke", "#cccccc")
    .attr("stroke-opacity", 0.4)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", 1.5);

  let nodeGroup = svg.append("g").selectAll("g").data(nodes).join("g");

  let shapes = nodeGroup.append("path")
    .attr("d", function(d) {
        let area = d.isCenterNode ? Math.PI * Math.pow(45, 2) : Math.PI * Math.pow(12, 2);
        return d.isCenterNode ? getCircle(area) : shapeScale(d.genre)(area);
    })
    .attr("fill", d => d.isCenterNode ? "#89CFF0" : colourScale(d.primaryType))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2.5)
    .style("cursor", "pointer");

  shapes.filter(d => !d.isCenterNode).append("title")
    .text(d => 
      `${d.isArtistLevel ? 'Artist' : 'Song'}: ${d.songTitle}\n` +
      `${d.isArtistLevel ? 'Record Label' : 'By'}: ${d.artist}\n` +
      `Genre: ${d.genre}\nType: ${d.influenceTypesString}\nYear: ${d.date.getFullYear()}`
    );

  let labels = nodeGroup.append("text")
    .text(d => d.songTitle)
    .attr("y", d => d.isCenterNode ? 75 : -18)
    .attr("text-anchor", "middle")
    .attr("font-size", d => d.isCenterNode ? "22px" : "13px")
    .attr("font-weight", d => d.isCenterNode ? "bold" : "normal")
    .attr("fill", d => d.isCenterNode ? "#5DADE2" : "#444")
    .attr("pointer-events", "none");


  let liveType = null;
  let liveEra = null;
  let liveGenre = null;
  let liveSearch = "";

  
  function isMatch(d) {
    let matchType = liveType !== null ? d.allTypes.includes(liveType) : true;
    let matchEra = liveEra !== null ? d.decade === liveEra : true;
    let matchGenre = liveGenre !== null ? d.genre === liveGenre : true;
    let matchSearch = liveSearch !== "" ? (d.songTitle.toLowerCase().includes(liveSearch) || d.artist.toLowerCase().includes(liveSearch)) : true;
    
    return matchType && matchEra && matchGenre && matchSearch;
  }

  function updateFilters(duration = 300) {
    
    nodeGroup.transition().duration(duration)
      .attr("opacity", d => d.isCenterNode || isMatch(d) ? 1 : 0.05);

    link.transition().duration(duration)
      .attr("stroke-opacity", l => isMatch(l.target) ? 0.4 : 0.02);

    labels.transition().duration(duration)
      .attr("opacity", d => d.isCenterNode || isMatch(d) ? 1 : 0)
      .attr("font-weight", d => (liveSearch !== "" && !d.isCenterNode && (d.songTitle.toLowerCase().includes(liveSearch) || d.artist.toLowerCase().includes(liveSearch))) ? "bold" : "normal");


    let activeData = liveEra !== null ? [liveEra] : [];
    highlightLayer.selectAll("path").data(activeData, (d) => d).join(
        enter => enter.append("path")
            .attr("fill", "#5DADE2")
            .attr("opacity", 0)
            .attr("transform", `translate(${centre}, ${centre})`)
            .attr("d", function (d) {
              let inner = timeScale(new Date(d, 0, 1));
              let outer = timeScale(new Date(d + 10, 0, 1));
              return d3.arc()({ innerRadius: inner, outerRadius: outer, startAngle: 0, endAngle: 2 * Math.PI });
            })
            .call((e) => e.transition().duration(duration).attr("opacity", 0.15)),
        update => update,
        exit => exit.transition().duration(duration).attr("opacity", 0).remove()
      );


    svg.selectAll(".ring-text").transition().duration(duration)
      .attr("opacity", year => (liveEra === null || liveEra === year) ? 1 : 0.2)
      .attr("fill", year => liveEra === year ? "#5DADE2" : "#888");

    filterTypeGroup.selectAll("rect")
      .attr("opacity", t => (liveType === null || liveType === t) ? 1 : 0.2);
    
    filterEraGroup.selectAll("text.era-label")
      .attr("opacity", e => (liveEra === null || liveEra === e) ? 1 : 0.2)
      .attr("font-weight", e => liveEra === e ? "bold" : "normal");
    
    genreFilterGroup.selectAll(".genre-item").transition().duration(duration)
      .attr("opacity", g => (liveGenre === null || liveGenre === g) ? 1 : 0.2);
  }


  let filterTypeGroup = svg.append("g").attr("transform", "translate(40, 40)");
  filterTypeGroup.append("text").text("Filter by Influence Type (Colour):").attr("font-weight", "bold").attr("font-size", "14px").attr("y", -15);

  let typeItems = filterTypeGroup.selectAll(".type-item").data(influenceTypes).enter().append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .style("cursor", "pointer")
    .on("click", function (event, d) { liveType = liveType === d ? null : d; updateFilters(); });
    
  typeItems.append("rect").attr("width", 15).attr("height", 15).attr("fill", (d) => colourScale(d)).attr("rx", 3);
  typeItems.append("text").text((d) => d).attr("x", 25).attr("y", 12).attr("font-size", "13px").attr("fill", "#333");


  let uniqueDecades = Array.from(new Set(influencers.map((d) => d.decade))).sort((a, b) => a - b);
  let filterEraGroup = svg.append("g").attr("transform", `translate(${chartSize - 150}, 40)`);
  filterEraGroup.append("text").text("Filter by Era (Ring):").attr("font-weight", "bold").attr("font-size", "14px").attr("y", -15);

  let eraItems = filterEraGroup.selectAll(".era-item").data(uniqueDecades).enter().append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .style("cursor", "pointer")
    .on("click", function (event, d) { liveEra = liveEra === d ? null : d; updateFilters(); });
    
  eraItems.append("text").attr("class", "era-label").text((d) => `${d}s`).attr("y", 12).attr("font-size", "13px").attr("fill", "#333");


  let genreFilterGroup = svg.append("g").attr("transform", "translate(40, 1100)");
  genreFilterGroup.append("text").text("Filter by Genre (Shape):").attr("font-weight", "bold").attr("font-size", "14px").attr("y", -15);

  let genreItems = genreFilterGroup.selectAll(".genre-item").data(uniqueGenres).enter().append("g")
    .attr("class", "genre-item")
    .style("cursor", "pointer")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .on("click", function (event, val) {
      liveGenre = liveGenre === val ? null : val;
      updateFilters();
    });

  genreItems.each(function (val) {
    let group = d3.select(this);
    
    group.append("path")
      .attr("d", shapeScale(val)(100))
      .attr("transform", "translate(7, 7)")
      .attr("fill", "#bbb")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
      
    group.append("text").text(val).attr("x", 25).attr("y", 12).attr("font-size", "13px").attr("fill", "#333");
  });


  shapes.on("mouseover", function (event, hoveredNode) {
    let currentOpacity = d3.select(this.parentNode).attr("opacity");
    if (currentOpacity < 1 && currentOpacity !== null) return;

    // Dim non-connected nodes
    nodeGroup.attr("opacity", function (d) {
      if (d.id === hoveredNode.id) return 1;
      let isConnected = links.some(l => (l.source.id === hoveredNode.id && l.target.id === d.id) || (l.target.id === hoveredNode.id && l.source.id === d.id));
      return isConnected ? 1 : 0.1;
    });


    link.attr("stroke", l => (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) ? "#666" : "#cccccc")
      .attr("stroke-opacity", l => (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) ? 1 : 0.05)
      .attr("stroke-width", l => (l.source.id === hoveredNode.id || l.target.id === hoveredNode.id) ? 2.5 : 1.5);


    let group = d3.select(this.parentNode);
    group.select("path").attr("stroke", "#000").attr("stroke-width", 4);
    group.select("text").attr("opacity", 1).attr("font-weight", "bold");

    if (!hoveredNode.isCenterNode) {
      group.append("text")
        .attr("class", "hover-info")
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "900")
        .attr("fill", colourScale(hoveredNode.primaryType))
        .attr("stroke", "white")
        .attr("stroke-width", 4)
        .attr("paint-order", "stroke")
        .text((hoveredNode.isArtistLevel ? "RECORD LABEL: " : "BY: ") + hoveredNode.artist);
    }
  });

  shapes.on("mouseout", function () {
    updateFilters(0);
    shapes.attr("stroke", "#fff").attr("stroke-width", 2.5);
    link.attr("stroke", "#cccccc").attr("stroke-width", 1.5);
    svg.selectAll(".hover-info").remove();
  });

  sim.on("tick", function () {
    for (let i = 0; i < nodes.length; i++) {
      let d = nodes[i];
      if (!d.isCenterNode && !d.isDummy) {
        let innerBoundary = timeScale(new Date(d.decade, 0, 1));
        let outerBoundary = timeScale(new Date(d.decade + 10, 0, 1));
        let nodeRadius = 15;
        
        let dx = d.x - centre;
        let dy = d.y - centre;
        let distance = Math.sqrt(dx * dx + dy * dy) || 1;
        let fixedDistance = Math.min(outerBoundary - nodeRadius, Math.max(innerBoundary + nodeRadius, distance));
        
        d.x = centre + (dx / distance) * fixedDistance;
        d.y = centre + (dy / distance) * fixedDistance;
      }
    }
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    nodeGroup.attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  return container.node();
}
;

const _97 = (md) => {
return (
md`## Popularity/Influence Line Chart
Each uniquely coloured line on the graph represents a single artists career. 
The visualisation compares two seperate metrics: Cumulative Influence, the number of influence edge nodes pointing towards an artist, and Notable Hits, the number of notable songs an artist has released.`
)
};

const _99 = function viewof$metricToggle(Inputs){return(
Inputs.radio(
  new Map([
    ["Cumulative Influence", "Cumulative_Influence"],
    ["Notable Hits", "Cumulative_Notable_Hits"]
  ]), 
  { value: "Cumulative_Influence", label: "Select Metric to Track:" }
)
)};

const _102 = function LineChartPlot(line_chart_data,d3,metricToggle,Plot)
{
  const cleanData = line_chart_data.map(d => ({
    ...d,
    Years_Since_Debut: Number(d.Years_Since_Debut),
    Cumulative_Influence: Number(d.Cumulative_Influence),
    Cumulative_Notable_Hits: Number(d.Cumulative_Notable_Hits)
  }));

  const finalActiveYears = new Map();
  d3.group(cleanData, d => d.Artist_Name).forEach((rows, artist) => {
    let maxYear = 0;
    
    if (metricToggle === "Cumulative_Influence") {
      const activeInfluence = rows.filter(r => r.New_Influence_Edges > 0);
      maxYear = d3.max(activeInfluence, r => r.Years_Since_Debut) || 0;
    } else {
      const activeReleases = rows.filter(r => r.Songs_Released_This_Year !== "No releases");
      maxYear = d3.max(activeReleases, r => r.Years_Since_Debut) || 0;
    }
    
    finalActiveYears.set(artist, maxYear);
  });

  const trimmedData = cleanData.filter(d => d.Years_Since_Debut <= finalActiveYears.get(d.Artist_Name));

  const tooltipData = Array.from(d3.group(trimmedData, d => d.Years_Since_Debut), ([year, rows]) => {

    rows.sort((a, b) => b[metricToggle] - a[metricToggle]);
    
    let tooltipText = `Year ${year} of Career\n`;
    tooltipText += `------------------------\n`;
    
    rows.forEach(r => {
      let metricLabel = metricToggle === "Cumulative_Influence" ? "Edges" : "Hits";
      tooltipText += `${r.Artist_Name}: ${r[metricToggle]} ${metricLabel}\n`;
  
      if (metricToggle === "Cumulative_Notable_Hits") {
          tooltipText += `Releases: ${r.Songs_Released_This_Year}\n`; 
      }
      
      tooltipText += `\n`; 
    });

    return {
      Years_Since_Debut: year,
      tip_y: d3.max(rows, r => r[metricToggle]), 
      tooltipText: tooltipText.trim() 
    };
  });

  
  return Plot.plot({
    width: 1900,
    height: 900,
    
    
    marginTop: 30,
    marginLeft: 80,    
    marginRight: 140,
    marginBottom: 50, 
    grid: true,
    
    
    style: {
      fontSize: "16px", 
      fontFamily: "sans-serif"
    },
    
    x: {
      label: "Years Since Artist's Debut Release",
      tickFormat: d => `Year ${d}`
    },
    y: {
      label: metricToggle === "Cumulative_Influence" ? "Total Influence Edges" : "Total Notable Hits",
      zero: true,
      // Force the axis to round up to the next clean tick mark
      domain: [0, d3.max(trimmedData, d => d[metricToggle]) * 1.01], 
      nice: true 
    },
    
    color: {
      domain: ["Sailor Shift", "Kimberly Snyder", "Jay Walters"],
      range: ["#fc0335", "#03fc84", "#0394fc"]
    },


    marks: [
    
      Plot.lineY(trimmedData, {
        x: "Years_Since_Debut",
        y: metricToggle,
        stroke: "Artist_Name",
        strokeWidth: 4,
        curve: "step-after"
      }),
      
      Plot.text(trimmedData, Plot.selectLast({
        x: "Years_Since_Debut",
        y: metricToggle,
        z: "Artist_Name",
        text: "Artist_Name",
        fill: "Artist_Name",
        textAnchor: "start",
        dx: 8,
        fontSize: 20,
        fontWeight: "bold"
      })),
      
      Plot.ruleX(tooltipData, Plot.pointerX({
        x: "Years_Since_Debut",
        stroke: "#aaa",
        strokeWidth: 1.5,
        strokeDasharray: "4,4"
      })),
      
      Plot.tip(tooltipData, Plot.pointerX({
        x: "Years_Since_Debut",
        y: "tip_y",
        title: "tooltipText",
        fontFamily: "sans-serif",
        fontSize: 18 
      }))
    ]
  });
}
;

const _105 = (htl) => {
return (
htl.html`## Rising Star Satterplot
Compares every artist that has only recently begun releasing music in the Oceanus Folk genre (>6 years).
The visualisation provides two alternative X-Axis options: Velocity, the average number of notable songs per year, and Total Hits, the cumulative volume of notable songs. The visualisation also provides a slider to filter out artists that supersede the maximum active year threshold. `
)
};

const _107 = function viewof$scatterMode(Inputs){return(
Inputs.radio(
  ["Velocity (Rate per Year)", "Absolute Volume"],
  { value: "Velocity (Rate per Year)", label: "X-Axis:" }
)
)};

const _110 = function viewof$maxYears(Inputs){return(
Inputs.range(
  [3, `6`],
  { value: 50, step: 1, label: "Max Years Active:" }
)
)};

const _113 = function starFinderPlot(star_finder_data,maxYears,scatterMode,d3,Plot)
{
  const parsedData = star_finder_data.map(d => {
    const hits = Number(d.Total_Notable_Hits);
    const totalSongs = Number(d.Total_Songs_Released);
    const years = Number(d.Years_Active);
    
    const isTarget = ["Sailor Shift", "Kimberly Snyder", "Jay Walters"].includes(d.Artist_Name);
    const rawHitRate = totalSongs > 0 ? (hits / totalSongs) * 100 : 0;

    return {
      ...d,
      Years_Active: years,
      Total_Songs_Released: totalSongs,
      isTarget: isTarget,
      Hits_Absolute: hits,
      Hits_Velocity: hits / years,
      Hit_Rate_Percent: rawHitRate
    };
  });

  const filteredData = parsedData.filter(d => d.Years_Active <= maxYears);

  const xField = scatterMode === "Absolute Volume" ? "Hits_Absolute" : "Hits_Velocity";

  const stackedData = [];
  const groupedPoints = d3.group(filteredData, d => `${Number(d[xField]).toFixed(3)}_${Number(d.Hit_Rate_Percent).toFixed(1)}`);

  groupedPoints.forEach(group => {
    
    group.sort((a, b) => b.isTarget - a.isTarget);
    
    group.forEach((d, i) => {
      
      const yOffset = (i - (group.length - 1) / 2) * 2.0;

      // if (d.Hit_Rate_Percent >= 100) {
      //   // If at the 100% ceiling, stack downwards only
      //   yOffset = -(i * 2.0); 
      // } else if (d.Hit_Rate_Percent <= 0) {
      //   // If at the 0% floor, stack upwards only
      //   yOffset = i * 2.0; 
      // }
      
      stackedData.push({
        ...d,
        Stacked_X: d[xField],
        Stacked_Y: d.Hit_Rate_Percent + yOffset
      });
    });
  });

  const xMean = d3.mean(stackedData, d => d[xField]);
  const yMean = d3.mean(stackedData, d => d.Hit_Rate_Percent);

  return Plot.plot({
    subtitle: scatterMode === "Absolute Volume" 
      ? "Comparing Hit Efficiency vs. Total Hits."
      : "Comparing Hit Efficiency vs. Hit Velocity.",
    width: 1400,
    height: 800,
    marginBottom: 50,
    marginTop: 40,
    marginLeft: 80,
    marginRight: 120,
    grid: true,
    
    style: { 
      fontSize: "16px", 
      fontFamily: "sans-serif" 
    },
    
    x: {
      label: scatterMode === "Absolute Volume" ? "Total Hits (Volume of Notable Songs)" : "Hit Velocity (Notable Songs Per Year)",
      zero: true,
      nice: true,
      tickFormat: scatterMode === "Absolute Volume" ? (d => Number.isInteger(d) ? d : "") : undefined
    },
    y: {
      label: "Hit Efficiency (% of Songs That Become Notable)\n",
      zero: true,
      nice: true,
      domain: [0, 110],
      tickFormat: d => d <= 100 ? `${d}%` : ""
      // tickFormat: d => `${d}%` 
    },
    
    color: {
      domain: ["Sailor Shift", "Kimberly Snyder", "Jay Walters", "Other"],
      range: ["#fc0335", "#03fc84", "#0394fc", "#999999"] 
    },

    marks: [
      Plot.ruleX([xMean], { stroke: "#ffaa00", strokeWidth: 2, strokeDasharray: "4,4" }),
      Plot.ruleY([yMean], { stroke: "#ffaa00", strokeWidth: 2, strokeDasharray: "4,4" }),
      
      Plot.text([xMean], {
        x: d => d,
        frameAnchor: "top", 
        text: () => scatterMode === "Absolute Volume" ? "Average Total Hits" : "Average Velocity",
        fill: "#ffaa00",
        fontWeight: "bold",
        textAnchor: "start",
        dx: 8, 
        dy: 10 
      }),
      
      Plot.text([yMean], {
        y: d => d,
        frameAnchor: "right", 
        text: () => "Average Efficiency",
        fill: "#ffaa00",
        fontWeight: "bold",
        textAnchor: "end",
        dx: -10, 
        dy: -8  
      }),
      
      Plot.dot(stackedData, {
        x: "Stacked_X",
        y: "Stacked_Y",
        fill: d => d.isTarget ? d.Artist_Name : "Other",
        r: d => d.isTarget ? 12 : 7, 
        fillOpacity: d => d.isTarget ? 1 : 0.3,
        stroke: d => d.isTarget ? "black" : "#555555",
        strokeWidth: d => d.isTarget ? 2 : 1,
        tip: true,
        title: d => {
        let tooltipText = `${d.Artist_Name}\nYears Active: ${d.Years_Active}\nTotal Releases: ${d.Total_Songs_Released}\nNotable Hits: ${d.Hits_Absolute}\nHit Efficiency: ${d.Hit_Rate_Percent.toFixed(1)}%`;
          
          if (scatterMode !== "Absolute Volume") {
            tooltipText += `\nHit Velocity: ${d.Hits_Velocity.toFixed(2)}`;
          }
          
          return tooltipText;
        }
      }),
      
      Plot.text(stackedData, {
        x: "Stacked_X",
        y: "Stacked_Y",
        text: "Artist_Name",
        textAnchor: "start",
        dx: 12,
        fill: d => d.isTarget ? "black" : "#666666",
        fontWeight: d => d.isTarget ? "bold" : "normal",
        fontSize: d => d.isTarget ? 16 : 11
      })
    ]
  });
}
;

const _116 = (md) => {
return (
md`## Oceanus Folk Star Prediction
The two main areas that define a star in the music industry are their popularity amongst listeners and their influence on other artists. While this is the case for well established artists who have had long impactful careers, when applying the same criteria to newer artists early in their careers, in an attempt to identify the next stars of the music industry or a specific genre, it becomes apparent that the popularity metric is a more indicative predictor of success over influence, which is extremely sparce amongst newer artists. This is particularly evident when looking at Sailor Shift's early career, recording zero influence in her first 6 years despite releasing 6 notable songs up to that point. Naturally, influence appears to be a by-product of an artist's popularity rather than a driving factor. In light of this, my criteria for identifying the next big stars in the Oceanus Folk genre is focused on artists who have demonstrated they can release popular music, and notably, who have been releasing music in the genre for 6 years or less. When comparing a range of values, six years seemed the most appropriate for the upper limit of a rising star. The scatterplot above is designed to help identify an artist that matches these criteria. The first visualisation compares the total number of notable songs an artist has released against their percentage of released songs that became notable. This identifies the artists that are currently the most popular amongst those who qualify for the rising star title(<6 years). The second visualisation compares average number of notable releases an artist has per year, also against their hit efficiency. This identifies the artists with the highest rate of popularity, allowing artist's with even shorter careers to compete with those towards the upper limit. In my opinions this is more indicative of future success since it is not dependent on the length of an artist's career. The obvious first choice for a rising star prediction is the musical group Copper Canyon Ghosts; they lead in both Total Hits and Hit Velocity(rate per year) by a substantial amount, while displaying 100% Hit Efficiency. My next prediction is The Brine Choir who have 4 notable releases in 6 years, giving them the second most total hits and gives them a 0.67 Hit Velocity which is joint second amongst the artists. Despite having a lower hit efficiency, her popularity metrics are high enough in my opinion to grant her the rising star title. My final prediction is the musical group Selkie's Hollow. Despite only having three years in the Oceanus Folk genre, they have already released 5 songs, 2 of which are notable. This gives them a Hit Velocity of 0.67, placing them in the joint second spot for rate of popularity. Again their Hit Efficiency is particularly low, however this is not necessarily a downfall for them since artists who release a large volume of music have a better chance of producing more notable hits. I believe they have a lot of potential in the genre to become a star despite their short career.`
)
};

const _118 = (md) => {
return (
md`## Bar Chart Visualisation
This Visualisation is intended to visualise the rise in popularity of three artists throughout their music careers: Sailor Shift, Kimberly Snyder and Jay Walters. To collect data for this visualisation using R, I filtered the network graph for edges representing music releases, such as performance or composition. I removed duplicate edges to ensure tracks were not counted twice if an artist happened to both write and perform them. Comparing discographies across completely different eras is heavily skewed on a standard timeline, so I transformed the data by defining a new metric representing the years since each artist's debut. This normalised the three career trajectories to a shared starting point, allowing for a direct comparison of their early output volume and hit rate.

I visualised the transformed data using a zoomable stacked bar chart, mapping the normalised career timeline to the x-axis and total release volume to the y-axis. According to Mackinlay’s effectiveness criteria, mapping quantitative data to spatial length is the most accurate visual channel for human magnitude estimation. Artist identity, which is a nominal variable, is encoded using distinct colours. To represent the boolean notability attribute, I manipulated colour intensity. Darker segments of a bar denote notable releases, while lighter shades represent standard releases. This specific mapping exploits pre-attentive visual processing, naturally drawing the viewer’s eye toward the high value notable data without requiring conscious visual searching. 

Displaying three career discographies simultaneously generates considerable visual clutter. To ensure the graphic scaled well and remained comprehensible, I integrated interactive features such as panning, zooming, and artist/release filtering. Providing these dynamic controls addresses fundamental interaction design requirements by allowing users to filter out noise in the form of non notable releases and closely inspect specific career phases of one, two or three artists side by side. 

The resulting visualisation exposes vastly different models of career growth between the three artists. Sailor Shift exhibits a balanced discography with a healthy mixture of notable and non-notable releases, demonstrating a traditional perseverance throughout her career, striving to find the formula of what listeners enjoy. In contrast, both Jay Walters and Kimberly Snyder have an overwhelming high ratio of notable to standard music releases. Jay Walters begins his career rather slowly, releasing only two pieces of music in his first 6 years. From there onwards he exhibits exceptional consistency, releasing a steady stream of near exclusively notable music over the next four decades. Kimberly Snider's career on the other hand is explosive, releasing eight notable songs in the first 4 years of her career. Following a couple quiet years she experiences an immense concentration of popularity, releasing 19 notable tracks over a 7 year period and peaking at 8 in one year. This stark contrast in career trajectory reveals that success isn't achieved through one distinct pathway and notably unveils the challenge in pinpointing potential in younger artists to identify the next big stars of the industry.
`
)
};

const _120 = (md) => {
return (
md`## Influence Map Visualisation
This visualisation is designed to capture each of the three artists' impact on the music industry through the depiction of their influence on other artists. Using R, I developed an extraction function to create a multi-layered sub network for each artist. The script anchors on the central artist and their original music, then traces forward to find any subsequent music influenced by them, before linking back to identify the creators of those inspired songs/albums. In the case of Sailor Shift's influence, I implemented an additional forward looking join where in the case of an influence edge pointing directly to a band rather than a specific song/album, the script dynamically would fetch that newly inspired band's complete discography. Finally, rather than aggregating this data mathematically, all relevant nodes and edges were bound and packaged into a JSON structure, preserving the topological relationships required by observable javascript to draw the influence map. Within the frontend, javascript performs the final transformations required for visual clarity. To prevent inflated influence metrics, the script removes duplicate overlapping edges, merging multiple influence interactions into a single, multi labelled node. It also applies a targeted filter to exclude self influence loops, ensuring the visualisation measures strictly influence from other artists. 

typically directed networks become cluttered when visualising hundreds of connections. To solve this, I designed a radial timeline layout in D3.js. Each of the three artist's acts as the central anchor. The distance from this center encodes the release decade of the influenced song/album, mapping time to spatial position. For nominal attributes, I mapped the specific influence type to node colour and the musical genre to node shape. Utilising distinct shapes and colours for categorical data utilises the Gestalt principle of similarity, enabling viewers to pre-attentively group related works without conscious effort.

To handle high node density within specific decades, I applied a custom physics collision force (d3.forceCollide) to prevent overlapping elements. I also implemented a search bar alongside interactive legend toggles that manipulate node focusing/highlighting based on era, genre, or influence type. Providing these dynamic filtering tools directly supports established interaction paradigms, allowing users to isolate specific data patterns from an initially dense overview.

Interacting with these maps exposes the varying nature of each artist's influence footprint. Jay Walters exhibits a highly traditional influence footprint, where industry impact directly correlates with an artist's prime years. His network reveals a high concentration of influence throughout the 2010s and 2020s, with sparser connections at the beginning and towards the end of his career. In contrast, Kimberly Snyder’s map demonstrates a rare phenomenon of immediate industry impact. Her tight cluster of  influence within the decade she debuted suggests that her rapid rise in popularity triggered an influx of influenced creations, eluding the typical latency period required for artists to establish recognition in the industry. Sailor Shift presents an unusual case where despite having notable popularity and consistent music output, her overall influence footprint remains remarkably sparse. Furthermore, the limited influence she does incur is strictly from entire artists rather than specific songs or albums, indicating an impact that is foundational and cultural rather than directly musical. Despite their varying impact on the music industry, one area they are similar in is their ability to influence artists from a wide variety of genres, not being restricted to impacting just their inner community. 

`
)
};

const _122 = (md) => {
return (
md`## Line Chart Visualisation
This visualisation tracks the cumulative yearly growth of each artist's career, laying out the trajectory of their notable music as well as their influence. Using R, I extracted the discographies of the each artist to aggregate their annual output of notable music. To map influence, the script extracts edges targeting the artists or their works, resolving missing time-series data by inferring dates from an artist's earliest known release. To handle years where no activity occurred, which would normally break a drawn line, I generated a continuous sequence of years for each artist starting from their debut year. By joining the notable music and influence data to this timeline and imputing missing values with zeros, it created cumulative sums. The timeline was subsequently normalised to years since the artists debut to enable comparative analysis regardless of the specific decade each artist entered the industry.

The transformed data is as an interactive multi-line chart using Observable Plot. The x-axis represents the "years since debut" timeline, while the y-axis captures the cumulative totals. This relies on spatial position along axes, which is proven to be the most effective visual channel for quantitative magnitude extraction. To differentiate the career paths, each line represents a single artist and is mapped to a unique categorical colour. Instead of using a standard continuous, curved line, I applied a "step-after" curve. This specific visual encoding reflects how hits and influence are recorded on a year to year basis rather than a continuous interpolation implied by a traditional linear slope.

Plotting cumulative data creates a visual artifact where inactive artists appear to plateau indefinitely. To prevent this misleading visual clutter, the JavaScript computes the final active year for each artist based on the currently selected metric and stops their respective lines accordingly at that point on the x-axis. To facilitate granular comparison, I implemented an interactive vertical marker along with a tooltip that tracks the user's cursor. This interaction allows viewers to seamlessly retrieve precise numerical breakdowns for all active artists at any specific career milestone without needing to manually trace to the axis boundaries.

Toggling between the two metrics reveals discrepancies in how momentum of an artists career builds in the music industry. Based on the findings of the influence network visualisation, I believed that Sailor Shift's impact on the industry was exceptionally small, and this line chart only confirms that. Despite being in her sixteenth year of her career, Sailor Shift's impact abruptly stops at year ten, confirming the obvious disparity between her popularity and impact. The cumulative influence view only reinforces Kimberly Snyder's immense impact on the music industry, so much so that her influence gradient is actually steeper than her popularity gradient. Interestingly this visualisation reveals a huge spike in Kimberly Snyder's impact in her seventh year, aligning perfectly with her standout year in notable music creation. While Sailor Shift and Kimberly Snyder appear to be underperforming and overperforming in industry impact respectively in comparison to their popularity, Jay Walters exhibits a fairly similar gradient for impact and popularity which aligns with the steady and consistent career the previous visualisations have portrayed him having. While the previous visualisations gave a more in depth dive into the two metrics, popularity and influence, this visualisations provides a broader, clearer overview of the relationship between the two, giving a clearer oversight of the trajectories of the three different careers and each artists rise to success. `
)
};

const _124 = (md) => {
return (
md`## Reflection
### Challenge 1
The first challenge was visualising the influence network. I initially utilised a standard D3 force-directed graph. However, because influence data is highly interconnected, the nodes overlapped a lot making the visualisation incomprehensible. To solve this I used a custom d3.forceCollide physics simulation to create space between each node. The final solution achieved an optimal pre-attentive spatial organisation.
### Challenge 2
Comparing the rise in popularity of different era artists was a challenge. The Artists debuted in different decades, making a standard timeline ineffective for comparing the trajectories of their early careers. My initial approach involved creating faceted line charts for each artist, but this prevented direct comparative analysis. My solution was creating a normalised "Years Since Debut" metric for every node, which shifted all the artists to a shared timeline.
### Challenge 3
Another challenge was managing the sheer volume of categorical data without causing cognitive overload. I initially tried to encode all the variables simultaneously within my bar chart which ended up being visually incomprehensible. To resolve this, I implemented interaction design requirements by offloading data density onto interactive JavaScript widgets such as the notable song toggle, zooming and panning capabilities, and tooltips to ensure the visualisations remained clean by default which encourages the user to progressively reveal complexity without overwhelming the visual comprehensibility. 
## Future Research/Improvements
While the current radial layout scales well for individual artist networks, mapping an entire music genre simultaneously would reinstate visual noise. Future iterations could benefit from implementing Hierarchical Edge Bundling (Holten, 2006) to group adjacent influence links, reducing the visual noise of intersecting lines crossing the radial map. Implementing Network Motif Simplification (Dunne & Shneiderman, 2013) could allow the system to detect and collapse repetitive topological patterns, e.g. multiple artists covering the same song, into a single glyph, creating better scalability for larger datasets.`
)
};

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["data_cleaning_task3.R", {url: "./data_cleaning_task3.R", mimeType: "application/octet-stream", lastModified: 1777354450319.389, size: 2104}],
    ["q1a_influence_network@3.json", {url: "./q1a_influence_network@3.json", mimeType: "application/json", lastModified: 1777298993236.188, size: 45247}],
    ["q1b_collab_network@2.json", {url: "./q1b_collab_network@2.json", mimeType: "application/json", lastModified: 1777299048279.159, size: 94065}],
    ["q1c_oceanus_community@2.json", {url: "./q1c_oceanus_community@2.json", mimeType: "application/json", lastModified: 1777299096591.741, size: 472389}],
    ["barchart_data.csv", {url: "./barchart_data.csv", mimeType: "text/csv", lastModified: 1777353280506.877, size: 3169}],
    ["influence_map_data.json", {url: "./influence_map_data.json", mimeType: "application/json", lastModified: 1777353310585.994, size: 195400}],
    ["star_finder_data.csv", {url: "./star_finder_data.csv", mimeType: "text/csv", lastModified: 1777353290150.248, size: 478}],
    ["visualisation3_task3.R", {url: "./visualisation3_task3.R", mimeType: "application/octet-stream", lastModified: 1777354467112.214, size: 3785}],
    ["visualisation4_task3.R", {url: "./visualisation4_task3.R", mimeType: "application/octet-stream", lastModified: 1777354467110.4, size: 2031}],
    ["q2a_oceanus_influence_by_year.json", {url: "./q2a_oceanus_influence_by_year.json", mimeType: "application/json", lastModified: 1777380210540.087, size: 1300}],
    ["visualisation2_task3.R", {url: "./visualisation2_task3.R", mimeType: "application/octet-stream", lastModified: 1777354467108.27, size: 2102}],
    ["visualisation1_task3.R", {url: "./visualisation1_task3.R", mimeType: "application/octet-stream", lastModified: 1777354458548.327, size: 1325}],
    ["q2c_oceanus_flows.json", {url: "./q2c_oceanus_flows.json", mimeType: "application/json", lastModified: 1777380210544.112, size: 4713}],
    ["line_chart_data.csv", {url: "./line_chart_data.csv", mimeType: "text/csv", lastModified: 1777353326273.763, size: 7251}],
    ["q2b_genres_influenced_by_oceanus.json", {url: "./q2b_genres_influenced_by_oceanus.json", mimeType: "application/json", lastModified: 1777380210542.151, size: 850}],
    ["q2a_oceanus_releases_by_year.json", {url: "./q2a_oceanus_releases_by_year.json", mimeType: "application/json", lastModified: 1777380210512.388, size: 2897}],
    ["q2c_of_notoriety_by_year-1.json", {url: "./q2c_of_notoriety_by_year-1.json", mimeType: "application/json", lastModified: 1777380210540.117, size: 5966}],
    ["q2c_inspiration_over_time-1 (2).json", {url: "./q2c_inspiration_over_time-1 (2).json", mimeType: "application/json", lastModified: 1777380210769.255, size: 200533}],
    ["q2b_artists_influenced_by_oceanus (1).json", {url: "./q2b_artists_influenced_by_oceanus (1).json", mimeType: "application/json", lastModified: 1777380210748.343, size: 173218}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("cell 0", ["md"], _0);
  main.define("cell 5", ["md"], _5);
  main.define("q1a_influence_network3", ["FileAttachment"], _56);
  main.define("q1b_collab_network2", ["FileAttachment"], _60);
  main.define("q1c_oceanus_community2", ["FileAttachment"], _64);
  main.define("cell 21", ["md"], _21);
  main.define("radialData", ["q1a_influence_network3"], _24);
  main.define("radialLinksChart", ["radialData","d3"], _26);
  main.define("cell 30", ["md"], _30);
  main.define("treeChart", ["q1b_collab_network2","d3"], _33);
  main.define("cell 35", ["md"], _35);
  main.define("heatmap", ["q1c_oceanus_community2","d3"], _37);
  main.define("cell 39", ["md"], _39);
  main.define("cell 41", ["md"], _41);
  main.define("cell 132", ["md"], _132);
  main.define("d3", ["require"], _158);
  main.define("oceanus_influence_by_year", ["FileAttachment"], _150);
  main.define("oceanus_releases_by_year", ["FileAttachment"], _152);
  main.define("artists_influenced_by_oceanus", ["FileAttachment"], _154);
  main.define("genres_influenced_by_oceanus", ["FileAttachment"], _156);
  main.define("oceanus_flows", ["FileAttachment"], _160);
  main.define("inspiration_over_time", ["FileAttachment"], _162);
  main.define("oceanus_folk_notoriety", ["FileAttachment"], _164);
  main.define("cell 169", ["md"], _169);
  main.define("q2a_data", ["oceanus_influence_by_year","oceanus_releases_by_year"], _176);
  main.define("viewof$showMovingAverage", ["Inputs"], _178);
  main.define("showMovingAverage", ["Generators", "viewof$showMovingAverage"], (G, _) => G.input(_));
  main.define("initial selectedYear", [], _180);
  main.define("mutator selectedYear", ["Mutable", "initial selectedYear"], (M, _) => ((m) => [m, {get value() { return m.value; }, set value(v) { m.value = v; }}])(M(_)));
  main.define("mutable$selectedYear", ["mutator selectedYear"], ([, m]) => m);
  main.define("selectedYear", ["mutator selectedYear"], ([m]) => m);
  main.define("movingAverage", ["d3"], _182);
  main.define("viewof$visibleSeries", ["Inputs"], _184);
  main.define("visibleSeries", ["Generators", "viewof$visibleSeries"], (G, _) => G.input(_));
  main.define("q2a_chart", ["q2a_data","visibleSeries","d3"], _186);
  main.define("cell 172", ["md"], _172);
  main.define("genre_bar_chart", ["genres_influenced_by_oceanus","d3"], _195);
  main.define("artist_bar_chart", ["d3","artists_influenced_by_oceanus"], _197);
  main.define("cell 174", ["md"], _174);
  main.define("StackedAreaChart", ["inspiration_over_time","oceanus_folk_notoriety","d3"], _199);
  main.define("chart", ["d3","oceanus_flows"], _202);
  main.define("cell 135", ["md"], _135);
  main.define("cell 148", ["md"], _148);
  main.define("cell 216", ["md"], _216);
  main.define("cell 222", ["md"], _222);
  main.define("cell 68", ["md"], _68);
  main.define("barchart_data", ["FileAttachment"], _71);
  main.define("influence_map_data", ["FileAttachment"], _73);
  main.define("line_chart_data", ["FileAttachment"], _75);
  main.define("star_finder_data", ["FileAttachment"], _77);
  main.define("cell 83", ["md"], _83);
  main.define("barchart", ["barchart_data","d3"], _85);
  main.define("cell 88", ["md"], _88);
  main.define("viewof$selectedCenterArtist2", ["Inputs"], _90);
  main.define("selectedCenterArtist2", ["Generators", "viewof$selectedCenterArtist2"], (G, _) => G.input(_));
  main.define("influenceNetworkMap", ["influence_map_data","selectedCenterArtist2","d3"], _92);
  main.define("cell 97", ["md"], _97);
  main.define("viewof$metricToggle", ["Inputs"], _99);
  main.define("metricToggle", ["Generators", "viewof$metricToggle"], (G, _) => G.input(_));
  main.define("LineChartPlot", ["line_chart_data","d3","metricToggle","Plot"], _102);
  main.define("cell 105", ["htl"], _105);
  main.define("viewof$scatterMode", ["Inputs"], _107);
  main.define("scatterMode", ["Generators", "viewof$scatterMode"], (G, _) => G.input(_));
  main.define("viewof$maxYears", ["Inputs"], _110);
  main.define("maxYears", ["Generators", "viewof$maxYears"], (G, _) => G.input(_));
  main.define("starFinderPlot", ["star_finder_data","maxYears","scatterMode","d3","Plot"], _113);
  main.define("cell 116", ["md"], _116);
  main.define("cell 118", ["md"], _118);
  main.define("cell 120", ["md"], _120);
  main.define("cell 122", ["md"], _122);
  main.define("cell 124", ["md"], _124);
  return main;
}
