/**
json data format
{"STATION":{"LONGITUDE":116.587,"LATITUDE":40.074,"ELEVATION":55,"NAME":"Beijing","CODE":"ZBAA"},
"DATA": [[minTemperature], [maxTemperature], [Precipitation], [DatetimeValue]]}

Quantity Metric:
minTemperature: \[Degree]C
maxTemperature: \[Degree]C
Precipitation: cm
DatetimeValue: YYYYMMDD
*/
const api = `Shanghai.json`,
  margin = 20,
  WIDTH = Math.min(window.innerWidth, 1.3 * window.innerHeight) - margin,
  HEIGHT = window.innerHeight - margin,
  LOWEST = -40,
  HIGHEST = 60,
  maxPRCPRadius = WIDTH / 16;
const ANIMATION = {
  durationPerDay: 7.5 // unit: ms
};
const svg = d3.select("svg").attr("width", WIDTH).attr("height", HEIGHT);
// remove body unresolved when WIDTH and HEIGHT is setup
d3.select("#app").attr("unresolved", null);

const viewport = svg
  .append("g")
  .attr("class", "viewport")
  .attr("transform", "translate(" + WIDTH / 2 + "," + HEIGHT / 2 + ")");
const rScale = d3
  .scaleLinear()
  .domain([LOWEST, HIGHEST])
  .range([0, HEIGHT / 2 - margin]);
const yScale = (day, temp) =>
  -Math.cos(angleScale(day) * Math.PI / 180) * rScale(parseInt(temp));
const xScale = (day, temp) =>
  Math.sin(angleScale(day) * Math.PI / 180) * rScale(parseInt(temp));
const angleScale = d3.scaleLinear().range([0, 360]);
const prcpScale = d3.scaleLinear().range([0, maxPRCPRadius]);

const generateRadialGradient = selection => {
  const gradientControl = [
    {
      offset: "0%",
      stopColor: "rgb(0,24,35)"
    },
    {
      offset: "15%",
      stopColor: "rgb(0,59,93)"
    },
    {
      offset: "35%",
      stopColor: "rgb(30,107,154)"
    },
    {
      offset: "60%",
      stopColor: "rgb(81,183,231)"
    },
    {
      offset: "70%",
      stopColor: "rgb(147,222,168)"
    },
    {
      offset: "80%",
      stopColor: "rgb(253,212,95)"
    },
    {
      offset: "93%",
      stopColor: "rgb(230,108,86)"
    },
    {
      offset: "100%",
      stopColor: "rgb(105,37,19)"
    }
  ];
  selection
    .selectAll("stop")
    .data(gradientControl)
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.stopColor);
};

const renderAxis = axis => {
  axis
    .append("line")
    .attr("x2", d => xScale(d.index, 41))
    .attr("y2", d => yScale(d.index, 41))
    .attr("class", "axis-line");

  axis
    .append("line")
    .attr("x1", d => xScale(d.index, HIGHEST - 17))
    .attr("y1", d => yScale(d.index, HIGHEST - 17))
    .attr("x2", d => xScale(d.index, HIGHEST - 10.2))
    .attr("y2", d => yScale(d.index, HIGHEST - 10.2))
    .attr("class", "tick");

  axis
    .append("text")
    .attr("x", d => xScale(0, HIGHEST - 12))
    .attr("y", d => yScale(0, HIGHEST - 12))
    .attr("dx", ".25em")
    .attr("transform", d => {
      return `rotate(${angleScale(d.index)})`;
    })
    .text(d => d.month)
    .attr("class", "months")
    .style("font-size", 0.013 * HEIGHT);
};
const mathematicaPreprocess = json => {
  const data = json.DATA;
  return data[3].map((v, k) => ({
    date: v,
    tmin: +data[0][k],
    tmax: +data[1][k],
    prcp: +data[2][k] * 10
  }));
};

const d3Preprocess = json => {
  console.log(json);
  json.DATA = mathematicaPreprocess(json);
  const months = [];
  //find index for months based on data
  json.DATA.forEach((d, i) => {
    const day = moment(d.date, "YYYYMMDD");
    if (i === 0 || !moment(json.DATA[i - 1].date).isSame(day, "month")) {
      months.push({
        month: day.format("MMM").toUpperCase(),
        index: i
      });
    }
  });
  Object.assign(json.STATION, {
    geolocationDisplay:
      (json.STATION.LONGITUDE > 0
        ? `${json.STATION.LONGITUDE.toFixed(4)}° E`
        : `${-json.STATION.LONGITUDE.toFixed(4)}° W`) +
      "  " +
      (json.STATION.LATITUDE > 0
        ? `${json.STATION.LATITUDE.toFixed(4)}° N`
        : `${-json.STATION.LATITUDE.toFixed(4)}° S`) +
      "  " +
      `${json.STATION.ELEVATION}m`
  });
  return Object.assign({}, json, {
    months
  });
};

d3.json(api, (err, json) => {
  json = d3Preprocess(json);
  const days = json.DATA.length;
  angleScale.domain([0, days - 1]);
  const maxPRCP = d3.max(json.DATA, d => d.prcp);
  prcpScale.domain([0, maxPRCP]);

  // define gradients
  svg
    .append("defs")
    .append("radialGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", "33%")
    .attr("id", "heatGradient")
    .call(generateRadialGradient);

  //circle axis
  viewport
    .append("g")
    .attr("class", "circle-axis-container")
    .selectAll("circle.axis")
    .data(d3.range(LOWEST + 20, HIGHEST - 10, 10))
    .enter()
    .append("circle")
    .attr("r", d => rScale(d))
    .attr("class", "axis record");

  //axis lines
  viewport
    .append("g")
    .attr("class", "axis-container")
    .selectAll(".axis")
    .data(json.months)
    .enter()
    .call(renderAxis);

  //temperature axis labels
  const circleAxis = d3.range(LOWEST + 20, HIGHEST, 20).reduce(
    (p, d) =>
      p.concat([
        {
          temp: d,
          index: 180
        },
        {
          temp: d,
          index: 0
        }
      ]),
    []
  );

  const textPadding = {
    dx: 2 * window.innerWidth / 100,
    dy: 1.4 * window.innerHeight / 100
  };

  const temperatureLabel = viewport
    .append("g")
    .attr("class", "temperature-label-container")
    .selectAll("text.temperature")
    .data(circleAxis)
    .enter();

  temperatureLabel
    .append("rect")
    .attr("x", d => xScale(d.index, d.temp) - textPadding.dx)
    .attr("y", d => yScale(d.index, d.temp) - textPadding.dy)
    .attr("width", 2 * textPadding.dx)
    .attr("height", 2 * textPadding.dy)
    .style("fill", "#fff");

  temperatureLabel
    .append("text")
    .attr("x", d => xScale(d.index, d.temp))
    .attr("y", d => yScale(d.index, d.temp))
    .text(d => d.temp + "°C")
    .attr("class", "temperature-label")
    .style("font-size", 0.013 * HEIGHT);

  //temperature and precipitation

  viewport
    .append("g")
    .attr("class", "precipitation-container")
    .selectAll(".precipitation")
    .data(json.DATA)
    .enter()
    .append("circle")
    .attr("class", "precipitation")
    .attr("cx", (d, i) => (xScale(i, d.tmin) + xScale(i, d.tmax)) / 2)
    .attr("cy", (d, i) => (yScale(i, d.tmin) + yScale(i, d.tmax)) / 2)
    .style("opacity", 0)
    .transition()
    .duration(250)
    .ease(d3.easeBackOut)
    .delay((d, i) => i * ANIMATION.durationPerDay)
    .style("opacity", 1)
    .attr("r", d => prcpScale(d.prcp));

  viewport
    .append("g")
    .attr("class", "temperature-container")
    .selectAll(".temperature")
    .data(json.DATA)
    .enter()
    .append("line")
    .attr("x1", (d, i) => (xScale(i, d.tmin) + xScale(i, d.tmax)) / 2)
    .attr("x2", (d, i) => (xScale(i, d.tmin) + xScale(i, d.tmax)) / 2)
    .attr("y1", (d, i) => (yScale(i, d.tmin) + yScale(i, d.tmax)) / 2)
    .attr("y2", (d, i) => (yScale(i, d.tmin) + yScale(i, d.tmax)) / 2)
    .attr("class", "temperature")
    .style("stroke", "url(#heatGradient)")
    .transition()
    .duration(80)
    .delay((d, i) => i * ANIMATION.durationPerDay)
    .attr("x1", (d, i) => xScale(i, d.tmin))
    .attr("x2", (d, i) => xScale(i, d.tmax))
    .attr("y1", (d, i) => yScale(i, d.tmin))
    .attr("y2", (d, i) => yScale(i, d.tmax));

  //title
  svg
    .append("text")
    .attr("x", WIDTH / 2)
    .attr("y", HEIGHT / 2)
    .text(json.STATION.NAME)
    .attr("class", "title")
    .style("font-size", 0.036 * HEIGHT);

  // geolocation
  svg
    .append("text")
    .attr("x", WIDTH - margin)
    .attr("y", HEIGHT - margin)
    .text(json.STATION.geolocationDisplay)
    .attr("class", "footnote")
    .style("font-size", 0.018 * HEIGHT);

  svg
    .append("text")
    .attr("x", WIDTH - margin)
    .attr("y", HEIGHT - margin)
    .attr("dy", -margin)
    .text(json.STATION.CODE)
    .attr("class", "footnote")
    .style("font-size", 0.018 * HEIGHT);

  svg.attr("title", json.STATION.NAME);
});

Mousetrap.bind(["command+s", "ctrl+s"], function saveRadialAsSVG() {
  const domNode = document.getElementsByTagName("svg")[0];
  const fileName = d3.select(domNode).attr("title") + ".svg";
  saveAsSVG(domNode, fileName);
  return false;
});

/**
 * save as svg file given DOM node and fileName
 * @param domNode the DOM node that should be save as svg
 * @param fileName the expected file name saved to local filesystem
 */
const saveAsSVG = (domNode, fileName) => {
  const serializer = new XMLSerializer();
  const svgBlob = new Blob([serializer.serializeToString(domNode)], {
    type: "image/svg+xml"
  });
  saveAs(svgBlob, fileName);
};
