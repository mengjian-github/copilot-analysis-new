var GranularityImplementation = class {
    constructor(prefix) {
      this.prefix = prefix;
    }
    static {
      __name(this, "GranularityImplementation");
    }
    getCurrentAndUpComingValues(now) {
      let currentValue = this.getValue(now),
        upcomingValues = this.getUpcomingValues(now);
      return [currentValue, upcomingValues];
    }
  },
  ConstantGranularity = class extends GranularityImplementation {
    static {
      __name(this, "ConstantGranularity");
    }
    getValue(now) {
      return this.prefix;
    }
    getUpcomingValues(now) {
      return [];
    }
  },
  DEFAULT_GRANULARITY = __name(prefix => new ConstantGranularity(prefix), "DEFAULT_GRANULARITY"),
  TimeBucketGranularity = class extends GranularityImplementation {
    constructor(prefix, fetchBeforeFactor = .5, anchor = new Date().setUTCHours(0, 0, 0, 0)) {
      super(prefix);
      this.prefix = prefix;
      this.fetchBeforeFactor = fetchBeforeFactor;
      this.anchor = anchor;
    }
    static {
      __name(this, "TimeBucketGranularity");
    }
    setTimePeriod(lengthMs) {
      isNaN(lengthMs) ? this.timePeriodLengthMs = void 0 : this.timePeriodLengthMs = lengthMs;
    }
    setByCallBuckets(numBuckets) {
      isNaN(numBuckets) ? this.numByCallBuckets = void 0 : this.numByCallBuckets = numBuckets;
    }
    getValue(now) {
      return this.prefix + this.getTimePeriodBucketString(now) + (this.numByCallBuckets ? this.timeHash(now) : "");
    }
    getTimePeriodBucketString(now) {
      return this.timePeriodLengthMs ? this.dateToTimePartString(now) : "";
    }
    getUpcomingValues(now) {
      let upcomingValues = [],
        upcomingTimePeriodBucketStrings = this.getUpcomingTimePeriodBucketStrings(now),
        upcomingByCallBucketStrings = this.getUpcomingByCallBucketStrings();
      for (let upcomingTimePeriodBucketString of upcomingTimePeriodBucketStrings) for (let upcomingByCallBucketString of upcomingByCallBucketStrings) upcomingValues.push(this.prefix + upcomingTimePeriodBucketString + upcomingByCallBucketString);
      return upcomingValues;
    }
    getUpcomingTimePeriodBucketStrings(now) {
      if (this.timePeriodLengthMs === void 0) return [""];
      if ((now.getTime() - this.anchor) % this.timePeriodLengthMs < this.fetchBeforeFactor * this.timePeriodLengthMs) return [this.getTimePeriodBucketString(now)];
      {
        let inABit = new Date(now.getTime() + this.timePeriodLengthMs);
        return [this.getTimePeriodBucketString(now), this.getTimePeriodBucketString(inABit)];
      }
    }
    getUpcomingByCallBucketStrings() {
      return this.numByCallBuckets === void 0 ? [""] : Array.from(Array(this.numByCallBuckets).keys()).map(x => x.toString());
    }
    timeHash(time) {
      return this.numByCallBuckets == null ? 0 : 7883 * (time.getTime() % this.numByCallBuckets) % this.numByCallBuckets;
    }
    dateToTimePartString(date) {
      return this.timePeriodLengthMs == null ? "" : Math.floor((date.getTime() - this.anchor) / this.timePeriodLengthMs).toString();
    }
  };